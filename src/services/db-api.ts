import { Router } from 'express';
import * as db from './db-repo';
import { Client, Prompt, RunCycle, Run, Diagnostic, ActionItem, PageAnalysis, AppSettings } from '../types';

const router = Router();

// ====== Clients ======
router.get('/clients/:id', async (req, res) => {
  try {
    const client = await db.getClient(req.params.id);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json(client);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/clients', async (req, res) => {
  try {
    const ownerId = (req.query.ownerId as string) || 'default-owner';
    let clients = await db.listClientsByOwner(ownerId);
    if (clients.length === 0) {
      clients = await db.seedInitialDemoData(ownerId);
    }
    res.json(clients);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/clients', async (req, res) => {
  try {
    const client: Client = req.body;
    if (!client.id || !client.ownerId) return res.status(400).json({ error: 'Missing id or ownerId' });
    await db.saveClient(client);
    res.json(client);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/clients/:id', async (req, res) => {
  try {
    await db.deleteClient(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ====== Prompts ======
router.get('/prompts/:id', async (req, res) => {
  try {
    const prompt = await db.getPrompt(req.params.id);
    if (!prompt) return res.status(404).json({ error: 'Prompt not found' });
    res.json(prompt);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/prompts', async (req, res) => {
  try {
    const clientId = req.query.clientId as string;
    if (!clientId) return res.status(400).json({ error: 'clientId query parameter required' });
    const prompts = await db.listPromptsByClient(clientId);
    res.json(prompts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/prompts', async (req, res) => {
  try {
    const prompt: Prompt = req.body;
    if (!prompt.id) return res.status(400).json({ error: 'Missing id' });
    await db.savePrompt(prompt);
    res.json(prompt);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/prompts/batch', async (req, res) => {
  try {
    const prompts: Prompt[] = req.body.prompts || [];
    await db.savePrompts(prompts);
    res.json({ saved: prompts.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/prompts/:id', async (req, res) => {
  try {
    await db.deletePrompt(req.params.id);
    res.json({ deleted: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ====== Run Cycles ======
router.get('/cycles/:id', async (req, res) => {
  try {
    const cycle = await db.getRunCycle(req.params.id);
    if (!cycle) return res.status(404).json({ error: 'Cycle not found' });
    res.json(cycle);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/cycles', async (req, res) => {
  try {
    const clientId = req.query.clientId as string;
    if (!clientId) return res.status(400).json({ error: 'clientId query parameter required' });
    const cycles = await db.listRunCyclesByClient(clientId);
    res.json(cycles);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/cycles', async (req, res) => {
  try {
    const cycle: RunCycle = req.body;
    if (!cycle.id) return res.status(400).json({ error: 'Missing id' });
    await db.saveRunCycle(cycle);
    res.json(cycle);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/cycles/batch', async (req, res) => {
  try {
    const cycles: RunCycle[] = req.body.cycles || [];
    await db.saveRunCycles(cycles);
    res.json({ saved: cycles.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ====== Runs ======
router.get('/runs/:id', async (req, res) => {
  try {
    const run = await db.getRun(req.params.id);
    if (!run) return res.status(404).json({ error: 'Run not found' });
    res.json(run);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/runs', async (req, res) => {
  try {
    const cycleId = req.query.cycleId as string;
    const clientId = req.query.clientId as string;
    if (cycleId) {
      const runs = await db.listRunsByCycle(cycleId);
      return res.json(runs);
    }
    if (clientId) {
      const runs = await db.listRunsByClient(clientId);
      return res.json(runs);
    }
    return res.status(400).json({ error: 'cycleId or clientId query parameter required' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/runs/batch', async (req, res) => {
  try {
    const runs: Run[] = req.body.runs || [];
    await db.saveRuns(runs);
    res.json({ saved: runs.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ====== Diagnostics ======
router.get('/diagnostics/:id', async (req, res) => {
  try {
    const diag = await db.getDiagnostic(req.params.id);
    if (!diag) return res.status(404).json({ error: 'Diagnostic not found' });
    res.json(diag);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/diagnostics', async (req, res) => {
  try {
    const clientId = req.query.clientId as string;
    if (!clientId) return res.status(400).json({ error: 'clientId query parameter required' });
    const diags = await db.listDiagnosticsByClient(clientId);
    res.json(diags);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/diagnostics', async (req, res) => {
  try {
    const diag: Diagnostic = req.body;
    if (!diag.id) return res.status(400).json({ error: 'Missing id' });
    await db.saveDiagnostic(diag);
    res.json(diag);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ====== Action Items ======
router.get('/actions/:id', async (req, res) => {
  try {
    const action = await db.getActionItem(req.params.id);
    if (!action) return res.status(404).json({ error: 'Action not found' });
    res.json(action);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/actions', async (req, res) => {
  try {
    const clientId = req.query.clientId as string;
    if (!clientId) return res.status(400).json({ error: 'clientId query parameter required' });
    const actions = await db.listActionItemsByClient(clientId);
    res.json(actions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/actions', async (req, res) => {
  try {
    const action: ActionItem = req.body;
    if (!action.id) return res.status(400).json({ error: 'Missing id' });
    await db.saveActionItem(action);
    res.json(action);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/actions/batch', async (req, res) => {
  try {
    const actions: ActionItem[] = req.body.actions || [];
    await db.saveActionItems(actions);
    res.json({ saved: actions.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ====== Page Analyses ======
router.get('/analyses/:id', async (req, res) => {
  try {
    const analysis = await db.getPageAnalysis(req.params.id);
    if (!analysis) return res.status(404).json({ error: 'Analysis not found' });
    res.json(analysis);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/analyses', async (req, res) => {
  try {
    const clientId = req.query.clientId as string;
    if (!clientId) return res.status(400).json({ error: 'clientId query parameter required' });
    const analyses = await db.listPageAnalysesByClient(clientId);
    res.json(analyses);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/analyses', async (req, res) => {
  try {
    const analysis: PageAnalysis = req.body;
    if (!analysis.id) return res.status(400).json({ error: 'Missing id' });
    await db.savePageAnalysis(analysis);
    res.json(analysis);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ====== Settings ======
router.get('/settings', async (req, res) => {
  try {
    const ownerId = req.query.ownerId as string | undefined;
    const settings = await db.getSettings(ownerId);
    res.json(settings || { defaultRunsPerPrompt: 3, activeEngine: 'gemini-grounded' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/settings', async (req, res) => {
  try {
    const settings: AppSettings = req.body;
    const ownerId = req.query.ownerId as string | undefined;
    await db.saveSettings(settings, ownerId);
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/purge-mock-data', async (req, res) => {
  try {
    const clientId = req.query.clientId as string | undefined;
    const result = await db.purgeAllMockData(clientId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/batch-sync', async (req, res) => {
  try {
    const { client, prompts } = req.body;
    if (client && client.id) {
      await db.batchSaveClientAndPrompts(client, prompts);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
