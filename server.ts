import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  AuditEntry,
  DeclarationField,
  ScanImage,
  ScanSession,
  SideType,
  UserProfile
} from './src/types.js';
import {
  computeDashboardMetrics,
  getDb,
  persistDb,
  resetDb
} from './server/db.js';
import {
  assessImageQuality,
  runGeminiMultimodalPipeline
} from './server/gemini.js';
import { evaluateComplianceRules } from './server/rules/ruleEngine.js';

function maskPhone(phone: string | undefined | null): string {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '').slice(-10);
  if (digits.length === 10) {
    return `${digits.slice(0, 4)}XXXX${digits.slice(8, 10)}`;
  }
  return 'XXXX';
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON payload limit for high-resolution package photos (up to 50MB)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Helper to extract session token from Authorization header or custom header
  function extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7).trim();
    }
    if (req.headers['x-auth-token']) {
      return String(req.headers['x-auth-token']).trim();
    }
    return null;
  }

  // Helper to extract authenticated user (returns null if unauthenticated)
  function getCurrentUser(req: Request): UserProfile | null {
    const db = getDb();
    const token = extractToken(req);
    const userIdHeader = req.headers['x-user-id'] as string | undefined;

    // 1. Validate by session token
    if (token) {
      if (db.sessions_auth && db.sessions_auth[token]) {
        const session = db.sessions_auth[token];
        if (session.expiresAt > Date.now()) {
          const user = db.users[session.userId];
          if (user) return user;
        } else {
          delete db.sessions_auth[token];
          persistDb();
        }
      }

      // Backward compatibility for standard demo token formats
      if (token.startsWith('token_')) {
        const parsedId = token.replace('token_', '');
        if (db.users[parsedId]) {
          return db.users[parsedId];
        }
      }
    }

    // 2. Validate by direct user ID header only if exists in DB
    if (userIdHeader && db.users[userIdHeader]) {
      return db.users[userIdHeader];
    }

    // Do NOT automatically fallback to an inspector user - unauthenticated users must login
    return null;
  }

  // Route protection middleware
  function requireAuth(req: Request, res: Response, next: NextFunction) {
    const user = getCurrentUser(req);
    if (!user) {
      return res.status(401).json({
        error: 'Authentication required. Please log in to access this feature.',
        code: 'UNAUTHORIZED'
      });
    }
    (req as any).user = user;
    next();
  }

  // Health check endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'inspectra' });
  });

  // ==================== AUTH ROUTES (NO OTP) ====================

  // Create Account: Name + 10-digit Phone -> Continue (No OTP)
  app.post('/api/auth/create-account', (req: Request, res: Response) => {
    try {
      const { name, mobileNumber, phone } = req.body;
      const rawPhone = mobileNumber || phone;
      const trimmedName = typeof name === 'string' ? name.trim() : '';

      if (!trimmedName) {
        return res.status(400).json({ error: 'Enter your name.' });
      }

      const cleanNumber = String(rawPhone || '').replace(/\D/g, '').slice(-10);
      if (!cleanNumber || cleanNumber.length !== 10 || !/^[6-9]\d{9}$/.test(cleanNumber)) {
        return res.status(400).json({ error: 'Enter a valid 10-digit mobile number.' });
      }

      const db = getDb();
      let user = Object.values(db.users).find(u => u.mobileNumber === cleanNumber);

      if (!user) {
        const id = `usr_${Date.now()}`;
        user = {
          id,
          name: trimmedName,
          mobileNumber: cleanNumber,
          email: `${cleanNumber}@inspectra.local`,
          role: 'USER',
          organization: 'Legal Metrology Quality Assurance',
          createdAt: new Date().toISOString()
        };
        db.users[id] = user;
      } else {
        user.name = trimmedName;
      }

      const token = `token_${user.id}_${Date.now()}`;
      db.sessions_auth = db.sessions_auth || {};
      db.sessions_auth[token] = {
        userId: user.id,
        createdAt: Date.now(),
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000
      };
      persistDb();

      console.log(`[INSPECTRA AUTH] Account created/verified for ${user.name} (${maskPhone(cleanNumber)})`);
      res.json({ user, token });
    } catch (err: any) {
      console.error('[INSPECTRA AUTH] Create account error:', err?.message || err);
      res.status(500).json({ error: 'Unable to create your account. Please try again.' });
    }
  });

  // Alias for backward compatibility
  app.post('/api/auth/signup', (req: Request, res: Response) => {
    try {
      const { name, mobileNumber, phone } = req.body;
      const rawPhone = mobileNumber || phone;
      const trimmedName = typeof name === 'string' ? name.trim() : '';

      if (!trimmedName) {
        return res.status(400).json({ error: 'Enter your name.' });
      }

      const cleanNumber = String(rawPhone || '').replace(/\D/g, '').slice(-10);
      if (!cleanNumber || cleanNumber.length !== 10 || !/^[6-9]\d{9}$/.test(cleanNumber)) {
        return res.status(400).json({ error: 'Enter a valid 10-digit mobile number.' });
      }

      const db = getDb();
      let user = Object.values(db.users).find(u => u.mobileNumber === cleanNumber);

      if (!user) {
        const id = `usr_${Date.now()}`;
        user = {
          id,
          name: trimmedName,
          mobileNumber: cleanNumber,
          email: `${cleanNumber}@inspectra.local`,
          role: 'USER',
          organization: 'Legal Metrology Quality Assurance',
          createdAt: new Date().toISOString()
        };
        db.users[id] = user;
      } else {
        user.name = trimmedName;
      }

      const token = `token_${user.id}_${Date.now()}`;
      db.sessions_auth = db.sessions_auth || {};
      db.sessions_auth[token] = {
        userId: user.id,
        createdAt: Date.now(),
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000
      };
      persistDb();

      console.log(`[INSPECTRA AUTH] Signup account ready for ${user.name} (${maskPhone(cleanNumber)})`);
      res.json({ user, token });
    } catch (err: any) {
      console.error('[INSPECTRA AUTH] Signup error:', err?.message || err);
      res.status(500).json({ error: 'Unable to create your account. Please try again.' });
    }
  });

  // Login: Phone Number -> Continue (No OTP)
  // If account exists -> authenticate and return session
  // If no account exists -> returns 404 "No Inspectra account found."
  app.post('/api/auth/login', (req: Request, res: Response) => {
    try {
      const { mobileNumber, phone, email } = req.body;
      const rawPhone = mobileNumber || phone;

      if (!rawPhone && !email) {
        return res.status(400).json({ error: 'Enter a valid 10-digit mobile number.' });
      }

      const db = getDb();

      if (rawPhone) {
        const cleanNumber = String(rawPhone).replace(/\D/g, '').slice(-10);
        if (!cleanNumber || cleanNumber.length !== 10 || !/^[6-9]\d{9}$/.test(cleanNumber)) {
          return res.status(400).json({ error: 'Enter a valid 10-digit mobile number.' });
        }

        const user = Object.values(db.users).find(u => u.mobileNumber === cleanNumber);
        if (!user) {
          return res.status(404).json({
            error: 'No Inspectra account found.',
            code: 'ACCOUNT_NOT_FOUND'
          });
        }

        const token = `token_${user.id}_${Date.now()}`;
        db.sessions_auth = db.sessions_auth || {};
        db.sessions_auth[token] = {
          userId: user.id,
          createdAt: Date.now(),
          expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000
        };
        persistDb();

        console.log(`[INSPECTRA AUTH] Login successful for ${user.name} (${maskPhone(cleanNumber)})`);
        return res.json({ user, token });
      }

      // Email fallback if ever used
      if (email) {
        const user = Object.values(db.users).find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
        if (!user) {
          return res.status(404).json({
            error: 'No Inspectra account found.',
            code: 'ACCOUNT_NOT_FOUND'
          });
        }
        const token = `token_${user.id}_${Date.now()}`;
        db.sessions_auth = db.sessions_auth || {};
        db.sessions_auth[token] = {
          userId: user.id,
          createdAt: Date.now(),
          expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000
        };
        persistDb();
        return res.json({ user, token });
      }
    } catch (err: any) {
      console.error('[INSPECTRA AUTH] Login error:', err?.message || err);
      res.status(500).json({ error: 'Login failed. Please try again.' });
    }
  });

  // Guest Explorer
  app.post('/api/auth/guest', (_req: Request, res: Response) => {
    const db = getDb();
    const guestUser = db.users['usr_guest'] || {
      id: 'usr_guest',
      email: 'guest@inspectra.local',
      name: 'Guest Inspector',
      mobileNumber: '9999999999',
      role: 'GUEST',
      organization: 'Citizen Screening Mode',
      createdAt: new Date().toISOString()
    };
    const token = `token_guest_${Date.now()}`;
    db.sessions_auth = db.sessions_auth || {};
    db.sessions_auth[token] = {
      userId: guestUser.id,
      createdAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
    };
    persistDb();
    res.json({ user: guestUser, token });
  });

  // Logout - revokes session token
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const token = extractToken(req);
    const db = getDb();
    if (token && db.sessions_auth && db.sessions_auth[token]) {
      delete db.sessions_auth[token];
      persistDb();
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });

  // Current authenticated user verification
  app.get('/api/auth/me', (req: Request, res: Response) => {
    const user = getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated. Please log in.', code: 'UNAUTHORIZED' });
    }
    res.json({ user });
  });

  // ==================== DASHBOARD & METRICS ====================

  app.get('/api/dashboard', requireAuth, (req: Request, res: Response) => {
    const db = getDb();
    const user = (req as any).user as UserProfile;
    const allSessions = Object.values(db.sessions);
    
    // If guest, show their own + demo sessions
    const visibleSessions = user.role === 'GUEST'
      ? allSessions.filter(s => s.userId === user.id || s.isDemo)
      : allSessions;

    const metrics = computeDashboardMetrics(visibleSessions);
    const recentScans = visibleSessions
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    res.json({ metrics, recentScans });
  });

  // ==================== SCANS / INSPECTION SESSIONS ====================

  app.get('/api/scans', requireAuth, (req: Request, res: Response) => {
    const db = getDb();
    const user = (req as any).user as UserProfile;
    const { search, status } = req.query;

    let list = Object.values(db.sessions);

    // Enforce user-specific scan history: non-supervisors only see their own scans + shared demo scans
    if (user.role !== 'SUPERVISOR') {
      list = list.filter(s => s.userId === user.id || s.isDemo);
    }

    if (status && typeof status === 'string' && status !== 'ALL') {
      list = list.filter(s => s.status === status);
    }

    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      list = list.filter(s => 
        s.scanId.toLowerCase().includes(q) ||
        (s.productIdentity?.productName || '').toLowerCase().includes(q) ||
        (s.productIdentity?.brand || '').toLowerCase().includes(q) ||
        (s.extractedDeclarations?.manufacturer?.value || '').toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ scans: list });
  });

  app.get('/api/scans/:scanId', requireAuth, (req: Request, res: Response) => {
    const db = getDb();
    const session = db.sessions[req.params.scanId];
    if (!session) {
      return res.status(404).json({ error: 'Inspection session not found' });
    }
    res.json({ session });
  });

  // Initialize new scan
  app.post('/api/scans', (req: Request, res: Response) => {
    const db = getDb();
    const user = getCurrentUser(req);
    const userId = user?.id || 'usr_guest';
    const userName = user?.name || 'Authorized Inspector';

    const count = Object.keys(db.sessions).length + 1;
    const scanId = `SCN-2026-${String(count).padStart(4, '0')}`;
    const sessionId = `sess_${Date.now()}`;
    const now = new Date().toISOString();

    const emptyField = (key: string, label: string): DeclarationField => ({
      key,
      label,
      value: null,
      status: 'NOT_DETECTED',
      confidence: 'LOW',
      sourceImage: null,
      evidence: null
    });

    const initialSession: ScanSession = {
      scanId,
      sessionId,
      userId,
      createdAt: now,
      updatedAt: now,
      status: 'DRAFT',
      images: { front: null, back: null, upper: null, lower: null },
      productIdentity: {
        brand: null,
        productName: null,
        variant: null,
        netQuantity: null,
        visibleIdentifier: null,
        packagingIdentifier: null,
        identityConfidence: 'LOW',
        consistencyScore: 0,
        isConsistent: true,
        matchAssessment: 'Pending complete photograph capture and cross-image inspection.',
        categoryDetermined: false,
        productCategory: null
      },
      rawExtractedText: { front: null, back: null, upper: null, lower: null },
      extractedDeclarations: {
        product_name: emptyField('product_name', 'Commodity Name & Description'),
        brand_name: emptyField('brand_name', 'Brand / Trade Name'),
        variant: emptyField('variant', 'Product Variant'),
        manufacturer: emptyField('manufacturer', 'Manufacturer Name'),
        packer: emptyField('packer', 'Packer Name (if different)'),
        importer: emptyField('importer', 'Importer Name (if imported)'),
        manufacturer_address: emptyField('manufacturer_address', 'Manufacturer Complete Address'),
        packer_address: emptyField('packer_address', 'Packer Address'),
        importer_address: emptyField('importer_address', 'Importer Address'),
        net_quantity: emptyField('net_quantity', 'Net Quantity (Standard Metric)'),
        mrp: emptyField('mrp', 'Maximum Retail Price (MRP incl. taxes)'),
        manufacturing_or_packing_date: emptyField('manufacturing_or_packing_date', 'Month & Year of Mfg / Packing'),
        best_before_or_expiry: emptyField('best_before_or_expiry', 'Best Before / Expiry Date'),
        import_date: emptyField('import_date', 'Import Month & Year'),
        consumer_care_details: emptyField('consumer_care_details', 'Consumer Care Cell Details'),
        country_of_origin: emptyField('country_of_origin', 'Country of Origin'),
        other_declarations: []
      },
      ruleResults: [],
      screeningScore: {
        overall: 0,
        mandatoryScore: 0,
        readabilityScore: 0,
        consistencyScore: 0,
        evidenceQualityScore: 0,
        status: 'REVIEW REQUIRED',
        disclaimer: 'Pending inspection and declaration extraction.'
      },
      evidenceList: [],
      auditTrail: [
        {
          id: `aud_${Date.now()}`,
          timestamp: now,
          user: userName,
          action: 'SCAN_SESSION_CREATED',
          details: `Inspection session ${scanId} initialized for 4-sided package scanning`
        }
      ]
    };

    db.sessions[scanId] = initialSession;
    persistDb();

    res.status(201).json({ session: initialSession });
  });

  // Upload or replace image for specific side
  app.post('/api/scans/:scanId/image', (req: Request, res: Response) => {
    const db = getDb();
    const user = getCurrentUser(req);
    const userName = user?.name || 'Authorized Inspector';
    const session = db.sessions[req.params.scanId];
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const { side, previewUrl, fileName } = req.body;
    if (!side || !['front', 'back', 'upper', 'lower'].includes(side)) {
      return res.status(400).json({ error: 'Valid side (front, back, upper, lower) required' });
    }
    if (!previewUrl) {
      return res.status(400).json({ error: 'Image data URL required' });
    }

    // Step 4: Perform instant image quality validation
    const quality = assessImageQuality(previewUrl, side as SideType);

    const scanImage: ScanImage = {
      id: `img_${session.scanId}_${side}_${Date.now()}`,
      side: side as SideType,
      previewUrl,
      quality,
      uploadedAt: new Date().toISOString(),
      fileName: fileName || `${side}_image.jpg`
    };

    session.images[side as SideType] = scanImage;
    session.updatedAt = new Date().toISOString();
    session.auditTrail.push({
      id: `aud_${Date.now()}`,
      timestamp: session.updatedAt,
      user: userName,
      action: 'IMAGE_UPLOADED',
      details: `Captured ${side.toUpperCase()} package side (Quality: ${quality.status})`
    });

    persistDb();
    res.json({ session, quality });
  });

  // Delete image for side
  app.delete('/api/scans/:scanId/image/:side', (req: Request, res: Response) => {
    const db = getDb();
    const user = getCurrentUser(req);
    const userName = user?.name || 'Authorized Inspector';
    const session = db.sessions[req.params.scanId];
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const side = req.params.side as SideType;
    session.images[side] = null;
    session.rawExtractedText[side] = null;
    session.updatedAt = new Date().toISOString();
    session.auditTrail.push({
      id: `aud_${Date.now()}`,
      timestamp: session.updatedAt,
      user: userName,
      action: 'IMAGE_REMOVED',
      details: `Removed ${side.toUpperCase()} package photograph`
    });

    persistDb();
    res.json({ session });
  });

  // Step 5: Full Real Image Analysis Pipeline (Two-Stage Vision + Compliance Engine)
  app.post('/api/scans/:scanId/analyze', async (req: Request, res: Response) => {
    const db = getDb();
    const user = getCurrentUser(req);
    const userName = user?.name || 'Authorized Inspector';
    const session = db.sessions[req.params.scanId];
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Enforce Front and Back mandatory images (Upper & Lower are optional)
    if (!session.images.front || !session.images.front.previewUrl) {
      return res.status(400).json({ error: 'Front image is required.' });
    }
    if (!session.images.back || !session.images.back.previewUrl) {
      return res.status(400).json({ error: 'Back image is required.' });
    }

    session.status = 'ANALYZING';
    persistDb();

    try {
      console.log(`[INSPECTRA] Starting two-stage analysis pipeline for scan ${session.scanId}...`);

      // 1. Run Two-Stage Vision Pipeline (Stage A: Raw OCR + Stage B: Declarations + Stage C: Reconciliation)
      const aiResult = await runGeminiMultimodalPipeline(session.images);

      session.productIdentity = aiResult.productIdentity;
      session.rawExtractedText = aiResult.rawExtractedText;
      session.extractedDeclarations = aiResult.extractedDeclarations;
      if (aiResult.debugAnalysis) {
        session.debugAnalysis = aiResult.debugAnalysis;
      }

      // 2. Deterministic Legal Metrology Rule Engine execution (Runs AFTER extraction)
      const ruleEval = evaluateComplianceRules(
        session.extractedDeclarations,
        session.productIdentity,
        session.rawExtractedText,
        db.rules
      );

      session.ruleResults = ruleEval.ruleResults;
      session.screeningScore = ruleEval.screeningScore;

      // Add Step 7 to Developer Analysis
      if (session.debugAnalysis) {
        session.debugAnalysis.steps.push({
          name: 'Rules Evaluated',
          status: ruleEval.screeningScore.status === 'PASS' ? 'SUCCESS' : 'WARNING',
          details: `Statutory screening completed: Score ${ruleEval.screeningScore.overall}/100 (${ruleEval.screeningScore.status}).`
        });
      }

      // 3. Compile visual evidence list
      const evidenceList = [];
      for (const key of Object.keys(session.extractedDeclarations)) {
        const dec = (session.extractedDeclarations as any)[key];
        if (dec && dec.evidence) {
          evidenceList.push(dec.evidence);
        }
      }
      session.evidenceList = evidenceList;

      // 4. Update session status
      if (!session.productIdentity.isConsistent) {
        session.status = 'MISMATCH_DETECTED';
      } else {
        session.status = 'COMPLETED';
      }

      session.updatedAt = new Date().toISOString();
      session.auditTrail.push({
        id: `aud_${Date.now()}`,
        timestamp: session.updatedAt,
        user: userName,
        action: 'AI_PIPELINE_AND_COMPLIANCE_EVALUATED',
        details: `Two-stage extraction and compliance evaluation completed. Screening score: ${session.screeningScore.overall}/100 (${session.screeningScore.status})`
      });

      persistDb();
      res.json({ session });
    } catch (err: any) {
      session.status = 'FAILED';
      persistDb();
      console.error(`[INSPECTRA] Error in scan analysis:`, err);
      res.status(500).json({ error: err?.message || 'Failed to complete image inspection pipeline' });
    }
  });

  // Step 16: Manual Correction of Extracted Declarations
  app.patch('/api/scans/:scanId/declaration', (req: Request, res: Response) => {
    const db = getDb();
    const user = getCurrentUser(req);
    const session = db.sessions[req.params.scanId];
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const { fieldKey, newValue, reason } = req.body;
    if (!fieldKey) {
      return res.status(400).json({ error: 'fieldKey is required' });
    }

    const field = (session.extractedDeclarations as any)[fieldKey] as DeclarationField;
    if (!field) {
      return res.status(404).json({ error: `Field ${fieldKey} not found in declarations` });
    }

    const oldValue = field.value;
    const now = new Date().toISOString();

    if (!field.isEdited) {
      field.originalValue = oldValue;
    }
    field.value = newValue ? String(newValue).trim() : null;
    field.status = newValue ? 'DETECTED' : 'NOT_DETECTED';
    field.isEdited = true;

    if (!field.editHistory) field.editHistory = [];
    field.editHistory.push({
      editor: user.name,
      timestamp: now,
      oldValue,
      newValue: field.value,
      reason: reason || 'Manual verification by inspector'
    });

    // Re-evaluate rules deterministically upon manual correction
    const reEval = evaluateComplianceRules(
      session.extractedDeclarations,
      session.productIdentity,
      session.rawExtractedText,
      db.rules
    );
    session.ruleResults = reEval.ruleResults;
    session.screeningScore = reEval.screeningScore;

    session.updatedAt = now;
    session.auditTrail.push({
      id: `aud_${Date.now()}`,
      timestamp: now,
      user: user.name,
      action: 'DECLARATION_MANUALLY_CORRECTED',
      details: `Field "${field.label}" updated from "${oldValue || 'None'}" to "${field.value || 'None'}". Reason: ${reason || 'Manual review'}`,
      oldValue,
      newValue: field.value
    });

    persistDb();
    res.json({ session });
  });

  // Human Review Request Flow (Section 27-31)
  app.post('/api/scans/:scanId/human-review', (req: Request, res: Response) => {
    const db = getDb();
    const user = getCurrentUser(req);
    const session = db.sessions[req.params.scanId];
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const { reason, note } = req.body;
    if (!reason) {
      return res.status(400).json({ error: 'Reason for human review is required.' });
    }

    const now = new Date().toISOString();
    session.status = 'HUMAN_REVIEW_REQUESTED';
    session.humanReview = {
      requestedBy: user.name,
      requestedAt: now,
      reason: String(reason).trim(),
      note: note ? String(note).trim() : undefined,
      status: 'PENDING'
    };

    session.updatedAt = now;
    session.auditTrail.push({
      id: `aud_${Date.now()}`,
      timestamp: now,
      user: user.name,
      action: 'HUMAN_REVIEW_REQUESTED',
      details: `Human review requested by ${user.name}. Reason: "${reason}". Note: "${note || 'None'}"`
    });

    persistDb();
    res.json({ session });
  });

  // Human Review Resolution (Section 30-31: Confirm, Correct, or Reject)
  app.post('/api/scans/:scanId/human-review/resolve', (req: Request, res: Response) => {
    const db = getDb();
    const user = getCurrentUser(req);
    const session = db.sessions[req.params.scanId];
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const { decision, observations, corrections } = req.body;
    if (!decision || !['CONFIRMED', 'CORRECTED', 'REJECTED'].includes(decision)) {
      return res.status(400).json({ error: 'Valid decision (CONFIRMED, CORRECTED, REJECTED) is required.' });
    }

    const now = new Date().toISOString();
    session.status = 'REVIEWED';

    if (!session.humanReview) {
      session.humanReview = {
        requestedBy: 'System / User',
        requestedAt: now,
        reason: 'Direct Inspector Verification',
        status: 'RESOLVED'
      };
    }

    session.humanReview.status = 'RESOLVED';
    session.humanReview.reviewerName = user.name;
    session.humanReview.reviewedAt = now;
    session.humanReview.reviewerDecision = decision;
    session.humanReview.observations = observations ? String(observations).trim() : undefined;

    // If corrections were made, update the fields while PRESERVING original AI values
    if (corrections && typeof corrections === 'object') {
      session.humanReview.corrections = {};
      for (const [key, correction] of Object.entries(corrections as Record<string, any>)) {
        const field = (session.extractedDeclarations as any)[key] as DeclarationField | undefined;
        if (field) {
          const aiVal = field.originalValue || field.value;
          const reviewedVal = String(correction.reviewedValue ?? '').trim();
          session.humanReview.corrections[key] = {
            aiValue: aiVal,
            reviewedValue: reviewedVal,
            reason: correction.reason || 'Human reviewer correction',
            timestamp: now,
            reviewer: user.name
          };

          if (!field.isEdited) {
            field.originalValue = field.value;
          }
          field.value = reviewedVal || null;
          field.status = reviewedVal ? 'DETECTED' : 'NOT_DETECTED';
          field.isEdited = true;

          if (!field.editHistory) field.editHistory = [];
          field.editHistory.push({
            editor: user.name,
            timestamp: now,
            oldValue: aiVal,
            newValue: reviewedVal,
            reason: `Human review: ${correction.reason || 'Inspector correction'}`
          });
        }
      }

      // Re-evaluate rules after human corrections
      const reEval = evaluateComplianceRules(
        session.extractedDeclarations,
        session.productIdentity,
        session.rawExtractedText,
        db.rules
      );
      session.ruleResults = reEval.ruleResults;
      session.screeningScore = reEval.screeningScore;
    }

    session.updatedAt = now;
    session.auditTrail.push({
      id: `aud_${Date.now()}`,
      timestamp: now,
      user: user.name,
      action: 'HUMAN_REVIEW_RESOLVED',
      details: `Human review resolved by ${user.name} with decision: ${decision}. Observations: ${observations || 'None'}`
    });

    persistDb();
    res.json({ session });
  });

  // Step 15: Read Text Page - Edit and preserve original vs edited raw text
  app.patch('/api/scans/:scanId/raw-text', (req: Request, res: Response) => {
    const db = getDb();
    const user = getCurrentUser(req);
    const session = db.sessions[req.params.scanId];
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const { side, editedRawText } = req.body;
    if (!side || !['front', 'back', 'upper', 'lower'].includes(side)) {
      return res.status(400).json({ error: 'Valid side required' });
    }

    const current = session.rawExtractedText[side as SideType];
    if (!current) {
      return res.status(404).json({ error: `No raw text found for ${side}` });
    }

    const now = new Date().toISOString();
    const oldText = current.rawText;
    current.rawText = editedRawText;
    session.updatedAt = now;

    session.auditTrail.push({
      id: `aud_${Date.now()}`,
      timestamp: now,
      user: user.name,
      action: 'RAW_TEXT_EDITED',
      details: `Raw OCR text for ${side.toUpperCase()} updated by inspector`
    });

    persistDb();
    res.json({ session });
  });

  // Step 29: Final Inspector Assessment
  app.post('/api/scans/:scanId/assessment', (req: Request, res: Response) => {
    const db = getDb();
    const user = getCurrentUser(req);
    const session = db.sessions[req.params.scanId];
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const { decision, notes } = req.body;
    if (!decision || !['ACCEPT', 'REJECT', 'ESCALATE_FOR_LEGAL_HEARING'].includes(decision)) {
      return res.status(400).json({ error: 'Valid decision required' });
    }

    session.inspectorAssessment = {
      assessedBy: user.name,
      assessedAt: new Date().toISOString(),
      decision,
      notes: notes || ''
    };

    session.updatedAt = new Date().toISOString();
    session.auditTrail.push({
      id: `aud_${Date.now()}`,
      timestamp: session.updatedAt,
      user: user.name,
      action: 'FINAL_INSPECTION_ASSESSMENT_LOGGED',
      details: `Inspector marked assessment: ${decision}. Notes: ${notes || 'None'}`
    });

    persistDb();
    res.json({ session });
  });

  // Rules management
  app.get('/api/rules', (_req: Request, res: Response) => {
    const db = getDb();
    res.json({ rules: db.rules });
  });

  app.patch('/api/rules/:ruleId', (req: Request, res: Response) => {
    const db = getDb();
    const rule = db.rules.find(r => r.id === req.params.ruleId);
    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }
    const { enabled } = req.body;
    if (typeof enabled === 'boolean') {
      rule.enabled = enabled;
      persistDb();
    }
    res.json({ rule });
  });

  // Reset demo datasets
  app.post('/api/scans/reset-demo', (_req: Request, res: Response) => {
    const freshDb = resetDb();
    res.json({ message: 'Database reset with realistic Legal Metrology demo inspection sets', count: Object.keys(freshDb.sessions).length });
  });

  // ==================== VITE MIDDLEWARE / SPA FALLBACK ====================

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[INSPECTRA] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
