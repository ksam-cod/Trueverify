import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  createCounterfeitReport,
  createProduct,
  getAuditData,
  listProducts,
  verifyCodeAndRecord,
} from './src/server/store';
import {
  validateCounterfeitReportInput,
  validateNewProductInput,
  type NewProductInput,
  type NewReportInput,
  type VerificationMethod,
} from './src/utils/verification';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/products', (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const products = listProducts(q, status);
    res.json({ products });
  });

  app.post('/api/products', (req, res) => {
    const body = req.body as Partial<NewProductInput>;
    const input: NewProductInput = {
      brand: String(body.brand ?? ''),
      productName: String(body.productName ?? ''),
      modelSku: String(body.modelSku ?? ''),
      category: String(body.category ?? ''),
      batchCode: String(body.batchCode ?? ''),
      originFacility: String(body.originFacility ?? ''),
      warrantyMonths: Number(body.warrantyMonths ?? 24),
      imageKey: body.imageKey,
    };

    const errors = validateNewProductInput(input);
    if (Object.keys(errors).length > 0) {
      res.status(400).json({ error: 'Validation failed', fieldErrors: errors });
      return;
    }

    const created = createProduct(input);
    res.status(201).json({ product: created });
  });

  app.post('/api/verify', (req, res) => {
    const body = req.body as {
      code?: string;
      method?: VerificationMethod;
      location?: string;
    };
    const code = String(body.code ?? '').trim();
    if (!code) {
      res.status(400).json({ error: 'Please enter a serial number or QR payload.' });
      return;
    }

    const method: VerificationMethod = body.method === 'qr' ? 'qr' : 'serial';
    const location = typeof body.location === 'string' ? body.location : 'Web Verification Portal';
    const evaluation = verifyCodeAndRecord(code, method, location);
    res.json({ evaluation });
  });

  app.get('/api/audit', (_req, res) => {
    res.json(getAuditData());
  });

  app.post('/api/reports', (req, res) => {
    const body = req.body as Partial<NewReportInput>;
    const input: NewReportInput = {
      serialEntered: String(body.serialEntered ?? ''),
      sellerName: String(body.sellerName ?? ''),
      purchaseChannel: String(body.purchaseChannel ?? 'Online Marketplace'),
      cityRegion: String(body.cityRegion ?? ''),
      notes: String(body.notes ?? ''),
    };

    const errors = validateCounterfeitReportInput(input);
    if (Object.keys(errors).length > 0) {
      res.status(400).json({ error: 'Validation failed', fieldErrors: errors });
      return;
    }

    const report = createCounterfeitReport(input);
    res.status(201).json({ report });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TrueVerify server listening on http://localhost:${PORT}`);
  });
}

startServer();
