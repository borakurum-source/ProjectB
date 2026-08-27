import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { z } from 'zod';
import express, { Request, Response, Router } from 'express';
import * as dbRepo from './db-repo';
import { Client, Prompt, RunCycle, Run, Diagnostic, ActionItem } from '../types';

export const mcpRouter = Router();

// Middleware to set CORS headers for all MCP endpoints (crucial for remote MCP clients & browser tools)
mcpRouter.use((req: Request, res: Response, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, mcp-session-id');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  next();
});

// Track active SSE transports by session ID
const activeTransports = new Map<string, SSEServerTransport>();

// Factory function to create a freshly configured McpServer instance
export function createRagsignalMcpServer() {
  const server = new McpServer({
    name: 'RAG Signal B2B AI Visibility MCP Server',
    version: '1.0.0',
    description: 'Model Context Protocol (MCP) server providing external AI agents and tools access to RAG Signal AEO/GEO visibility metrics, share of voice, citations, diagnostics, and grounded run execution.',
  });

  // TOOL 1: list_clients
  server.tool(
    'list_clients',
    'List all B2B clients tracked in RAG Signal with their domains, brand names, and competitor lists.',
    { ownerId: z.string().optional().describe('Optional owner ID filter') },
    async ({ ownerId }) => {
      const clients = await dbRepo.listClientsByOwner(ownerId || 'default-owner');
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(clients, null, 2),
          },
        ],
      };
    }
  );

  // TOOL 2: get_client_overview
  server.tool(
    'get_client_overview',
    'Get high-level AEO/GEO visibility metrics, Share of Voice (SoV), mention rate, citation rate, and top competitors for a specific client.',
    { clientId: z.string().describe('Target client ID') },
    async ({ clientId }) => {
      const client = await dbRepo.getClient(clientId);
      if (!client) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Client with ID "${clientId}" not found.` }],
        };
      }

      const prompts = await dbRepo.listPromptsByClient(clientId);
      const cycles = await dbRepo.listRunCyclesByClient(clientId);
      const runs = await dbRepo.listRunsByClient(clientId);
      const actions = await dbRepo.listActionItemsByClient(clientId);

      const latestCompletedCycle = cycles.find(c => c.status === 'completed');
      let mentionRate = 0;
      let citationRate = 0;
      let totalRuns = 0;

      if (latestCompletedCycle) {
        const cycleRuns = runs.filter(r => r.cycleId === latestCompletedCycle.id);
        totalRuns = cycleRuns.length;
        if (totalRuns > 0) {
          const mentioned = cycleRuns.filter(r => r.brandMentioned).length;
          const cited = cycleRuns.filter(r => r.brandCited).length;
          mentionRate = Math.round((mentioned / totalRuns) * 100);
          citationRate = Math.round((cited / totalRuns) * 100);
        }
      }

      // Compute Brand vs Competitor Mentions (Share of Voice)
      const brandCounts: Record<string, number> = {};
      runs.forEach(r => {
        r.mentionedBrands?.forEach(mb => {
          brandCounts[mb.name] = (brandCounts[mb.name] || 0) + 1;
        });
      });

      const overview = {
        client: {
          id: client.id,
          brandName: client.brandName,
          domain: client.domain,
          competitors: client.competitorBrands,
        },
        metrics: {
          mentionRate: `${mentionRate}%`,
          citationRate: `${citationRate}%`,
          sampleSizeRuns: totalRuns,
          latestRunCycleId: latestCompletedCycle?.id || null,
          latestRunDate: latestCompletedCycle?.completedAt || latestCompletedCycle?.startedAt || null,
          activePromptsCount: prompts.filter(p => p.active).length,
          openActionItemsCount: actions.filter(a => a.status === 'Todo' || a.status === 'In Progress').length,
        },
        shareOfVoiceCounts: brandCounts,
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(overview, null, 2) }],
      };
    }
  );

  // TOOL 3: list_prompts
  server.tool(
    'list_prompts',
    'List all tracked search prompts for a client, filtered by intent layer or active status.',
    {
      clientId: z.string().describe('Target client ID'),
      intentLayer: z.enum(['Informational', 'Commercial', 'Comparative', 'Navigational', 'Transactional']).optional().describe('Filter by intent layer'),
    },
    async ({ clientId, intentLayer }) => {
      let prompts = await dbRepo.listPromptsByClient(clientId);
      if (intentLayer) {
        prompts = prompts.filter(p => p.intentLayer === intentLayer);
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(prompts, null, 2) }],
      };
    }
  );

  // TOOL 4: get_share_of_voice
  server.tool(
    'get_share_of_voice',
    'Calculate Share of Voice (SoV) percentage breakdown across client brand and competitors based on grounded AI responses.',
    { clientId: z.string().describe('Target client ID') },
    async ({ clientId }) => {
      const runs = await dbRepo.listRunsByClient(clientId);
      const totalBrandMentions: Record<string, number> = {};
      let totalMentionsCount = 0;

      runs.forEach(run => {
        if (run.mentionedBrands && Array.isArray(run.mentionedBrands)) {
          run.mentionedBrands.forEach(b => {
            totalBrandMentions[b.name] = (totalBrandMentions[b.name] || 0) + 1;
            totalMentionsCount++;
          });
        }
      });

      const shareOfVoice: Array<{ brand: string; count: number; percentage: number }> = [];
      if (totalMentionsCount > 0) {
        Object.entries(totalBrandMentions).forEach(([brand, count]) => {
          shareOfVoice.push({
            brand,
            count,
            percentage: Math.round((count / totalMentionsCount) * 1000) / 10,
          });
        });
        shareOfVoice.sort((a, b) => b.count - a.count);
      }

      return {
        content: [{ type: 'text', text: JSON.stringify({ totalRunsAnalyzed: runs.length, totalBrandMentionsCount: totalMentionsCount, shareOfVoice }, null, 2) }],
      };
    }
  );

  // TOOL 5: get_citation_leaderboard
  server.tool(
    'get_citation_leaderboard',
    'Get the leaderboard of top web domain sources cited by AI search engines for a client prompt set.',
    { clientId: z.string().describe('Target client ID') },
    async ({ clientId }) => {
      const runs = await dbRepo.listRunsByClient(clientId);
      const domainCounts: Record<string, { count: number; titles: Set<string> }> = {};

      runs.forEach(run => {
        if (run.groundingSources && Array.isArray(run.groundingSources)) {
          run.groundingSources.forEach(source => {
            const domain = source.resolvedDomain || 'Unresolved source';
            if (!domainCounts[domain]) {
              domainCounts[domain] = { count: 0, titles: new Set() };
            }
            domainCounts[domain].count++;
            if (source.displayTitle) domainCounts[domain].titles.add(source.displayTitle);
          });
        }
      });

      const leaderboard = Object.entries(domainCounts)
        .map(([domain, data]) => ({
          domain,
          citationCount: data.count,
          sampleTitles: Array.from(data.titles).slice(0, 3),
        }))
        .sort((a, b) => b.citationCount - a.citationCount);

      return {
        content: [{ type: 'text', text: JSON.stringify({ totalRuns: runs.length, topDomains: leaderboard }, null, 2) }],
      };
    }
  );

  // TOOL 6: get_latest_diagnostics
  server.tool(
    'get_latest_diagnostics',
    'Get 6-dimension AEO/GEO diagnosis results (Intent Match, Entity Clarity, Answer Extractability, Content Coverage, Evidence/Authority, Structured Info) for a client.',
    { clientId: z.string().describe('Target client ID') },
    async ({ clientId }) => {
      const diagnostics = await dbRepo.listDiagnosticsByClient(clientId);
      return {
        content: [{ type: 'text', text: JSON.stringify(diagnostics, null, 2) }],
      };
    }
  );

  // TOOL 7: list_action_items
  server.tool(
    'list_action_items',
    'Get prioritized, concrete GEO/AEO optimization recommendations for a client.',
    {
      clientId: z.string().describe('Target client ID'),
      status: z.enum(['Todo', 'In Progress', 'Implemented', 'Retested']).optional().describe('Filter by action item status'),
    },
    async ({ clientId, status }) => {
      let actions = await dbRepo.listActionItemsByClient(clientId);
      if (status) {
        actions = actions.filter(a => a.status === status);
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(actions, null, 2) }],
      };
    }
  );

  // RESOURCE 1: rag-signal://clients
  server.resource(
    'all-clients',
    'rag-signal://clients',
    async (uri) => {
      const clients = await dbRepo.listClientsByOwner('default-owner');
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(clients, null, 2),
            mimeType: 'application/json',
          },
        ],
      };
    }
  );

  return server;
}

// REST & SSE ENDPOINTS FOR EXPRESS INTEGRATION

// 1. GET /api/mcp/info or GET /api/mcp - Status & Connection Instructions
mcpRouter.get(['/', '/info'], async (req: Request, res: Response) => {
  const host = req.get('x-forwarded-host') || req.get('host') || 'localhost:3000';
  const proto = req.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  const baseUrl = `${proto}://${host}`;

  res.json({
    status: 'online',
    protocol: 'Model Context Protocol (MCP)',
    version: '1.0.0',
    endpoints: {
      sse: `${baseUrl}/api/mcp/sse`,
      messages: `${baseUrl}/api/mcp/messages`,
      rpc: `${baseUrl}/api/mcp/rpc`,
      info: `${baseUrl}/api/mcp/info`,
    },
    capabilities: {
      tools: [
        'list_clients',
        'get_client_overview',
        'list_prompts',
        'get_share_of_voice',
        'get_citation_leaderboard',
        'get_latest_diagnostics',
        'list_action_items',
      ],
      resources: [
        'rag-signal://clients',
      ],
    },
    configInstructions: {
      cursor: {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-sse', `${baseUrl}/api/mcp/sse`],
      },
      claudeDesktop: {
        mcpServers: {
          'rag-signal': {
            url: `${baseUrl}/api/mcp/sse`,
          },
        },
      },
    },
  });
});

// 2. GET /api/mcp/sse - Establish SSE Connection
mcpRouter.get('/sse', async (req: Request, res: Response) => {
  try {
    const host = req.get('x-forwarded-host') || req.get('host') || 'localhost:3000';
    const proto = req.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    const baseUrl = `${proto}://${host}`;

    // Set headers explicitly for EventStream & disable proxy buffering (crucial for Cloud Run)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // Use full absolute postback URL for messages so external MCP clients can resolve it
    const messagesUrl = `${baseUrl}/api/mcp/messages`;
    const transport = new SSEServerTransport(messagesUrl, res);
    const mcpServer = createRagsignalMcpServer();
    
    // Generate session ID and register
    const sessionId = transport.sessionId;
    activeTransports.set(sessionId, transport);

    // Keep connection alive with periodic heartbeat pings (prevents Cloud Run idle timeout)
    const keepAlive = setInterval(() => {
      if (res.writableEnded || res.closed) {
        clearInterval(keepAlive);
        return;
      }
      res.write(': keep-alive\n\n');
    }, 15000);

    transport.onclose = () => {
      clearInterval(keepAlive);
      activeTransports.delete(sessionId);
    };

    await mcpServer.connect(transport);
  } catch (err: any) {
    console.error('[MCP SSE Error]:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to establish MCP SSE connection', message: err.message });
    }
  }
});

// 3. POST /api/mcp/messages - SSE Message Postback
mcpRouter.post('/messages', async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  if (!sessionId) {
    res.status(400).json({ error: 'Missing sessionId query parameter' });
    return;
  }

  const transport = activeTransports.get(sessionId);
  if (!transport) {
    res.status(404).json({ error: `Session "${sessionId}" not found or expired` });
    return;
  }

  await transport.handlePostMessage(req, res);
});

// 4. POST /api/mcp/rpc - Direct JSON-RPC Tool Execution (Convenient for curl & REST tools)
mcpRouter.post('/rpc', async (req: Request, res: Response) => {
  const { jsonrpc, id, method, params } = req.body || {};

  if (jsonrpc !== '2.0') {
    res.status(400).json({ jsonrpc: '2.0', id: id || null, error: { code: -32600, message: 'Invalid Request: jsonrpc must be 2.0' } });
    return;
  }

  try {
    if (method === 'tools/list') {
      res.json({
        jsonrpc: '2.0',
        id,
        result: {
          tools: [
            {
              name: 'list_clients',
              description: 'List all B2B clients tracked in RAG Signal with their domains, brand names, and competitor lists.',
              inputSchema: { type: 'object', properties: { ownerId: { type: 'string' } } },
            },
            {
              name: 'get_client_overview',
              description: 'Get high-level AEO/GEO visibility metrics, Share of Voice (SoV), mention rate, citation rate, and top competitors.',
              inputSchema: { type: 'object', properties: { clientId: { type: 'string' } }, required: ['clientId'] },
            },
            {
              name: 'list_prompts',
              description: 'List all tracked search prompts for a client.',
              inputSchema: { type: 'object', properties: { clientId: { type: 'string' }, intentLayer: { type: 'string' } }, required: ['clientId'] },
            },
            {
              name: 'get_share_of_voice',
              description: 'Calculate Share of Voice (SoV) percentage breakdown across client brand and competitors.',
              inputSchema: { type: 'object', properties: { clientId: { type: 'string' } }, required: ['clientId'] },
            },
            {
              name: 'get_citation_leaderboard',
              description: 'Get top web domain sources cited by AI search engines.',
              inputSchema: { type: 'object', properties: { clientId: { type: 'string' } }, required: ['clientId'] },
            },
            {
              name: 'get_latest_diagnostics',
              description: 'Get 6-dimension AEO/GEO diagnosis results.',
              inputSchema: { type: 'object', properties: { clientId: { type: 'string' } }, required: ['clientId'] },
            },
            {
              name: 'list_action_items',
              description: 'Get prioritized AEO/GEO optimization recommendations.',
              inputSchema: { type: 'object', properties: { clientId: { type: 'string' }, status: { type: 'string' } }, required: ['clientId'] },
            },
          ],
        },
      });
      return;
    }

    if (method === 'tools/call') {
      const name = params?.name;
      const args = params?.arguments || {};

      if (name === 'list_clients') {
        const clients = await dbRepo.listClientsByOwner(args.ownerId || 'default-owner');
        res.json({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(clients, null, 2) }] } });
        return;
      }

      if (name === 'get_client_overview') {
        const client = await dbRepo.getClient(args.clientId);
        if (!client) {
          res.json({ jsonrpc: '2.0', id, error: { code: -32602, message: `Client "${args.clientId}" not found.` } });
          return;
        }
        const prompts = await dbRepo.listPromptsByClient(args.clientId);
        const cycles = await dbRepo.listRunCyclesByClient(args.clientId);
        const runs = await dbRepo.listRunsByClient(args.clientId);
        const actions = await dbRepo.listActionItemsByClient(args.clientId);
        const latestCompletedCycle = cycles.find(c => c.status === 'completed');
        let mentionRate = 0;
        let citationRate = 0;
        let totalRuns = 0;
        if (latestCompletedCycle) {
          const cycleRuns = runs.filter(r => r.cycleId === latestCompletedCycle.id);
          totalRuns = cycleRuns.length;
          if (totalRuns > 0) {
            mentionRate = Math.round((cycleRuns.filter(r => r.brandMentioned).length / totalRuns) * 100);
            citationRate = Math.round((cycleRuns.filter(r => r.brandCited).length / totalRuns) * 100);
          }
        }
        res.json({
          jsonrpc: '2.0',
          id,
          result: {
            content: [{
              type: 'text',
              text: JSON.stringify({
                client,
                metrics: { mentionRate: `${mentionRate}%`, citationRate: `${citationRate}%`, sampleSizeRuns: totalRuns, activePromptsCount: prompts.filter(p => p.active).length, openActionsCount: actions.length },
              }, null, 2)
            }]
          }
        });
        return;
      }

      if (name === 'list_prompts') {
        let prompts = await dbRepo.listPromptsByClient(args.clientId);
        if (args.intentLayer) prompts = prompts.filter(p => p.intentLayer === args.intentLayer);
        res.json({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(prompts, null, 2) }] } });
        return;
      }

      if (name === 'get_share_of_voice') {
        const runs = await dbRepo.listRunsByClient(args.clientId);
        const brandCounts: Record<string, number> = {};
        let total = 0;
        runs.forEach(r => r.mentionedBrands?.forEach(mb => { brandCounts[mb.name] = (brandCounts[mb.name] || 0) + 1; total++; }));
        const sov = Object.entries(brandCounts).map(([brand, count]) => ({ brand, count, percentage: total > 0 ? Math.round((count / total) * 100) : 0 }));
        res.json({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify({ totalMentions: total, shareOfVoice: sov }, null, 2) }] } });
        return;
      }

      if (name === 'get_citation_leaderboard') {
        const runs = await dbRepo.listRunsByClient(args.clientId);
        const counts: Record<string, number> = {};
        runs.forEach(r => r.groundingSources?.forEach(s => { const d = s.resolvedDomain || 'Unresolved'; counts[d] = (counts[d] || 0) + 1; }));
        const leaderboard = Object.entries(counts).map(([domain, count]) => ({ domain, citationCount: count })).sort((a,b) => b.citationCount - a.citationCount);
        res.json({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(leaderboard, null, 2) }] } });
        return;
      }

      if (name === 'get_latest_diagnostics') {
        const diags = await dbRepo.listDiagnosticsByClient(args.clientId);
        res.json({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(diags, null, 2) }] } });
        return;
      }

      if (name === 'list_action_items') {
        let actions = await dbRepo.listActionItemsByClient(args.clientId);
        if (args.status) actions = actions.filter(a => a.status === args.status);
        res.json({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(actions, null, 2) }] } });
        return;
      }

      res.status(404).json({ jsonrpc: '2.0', id, error: { code: -32601, message: `Tool "${name}" not found.` } });
      return;
    }

    res.status(400).json({ jsonrpc: '2.0', id, error: { code: -32601, message: `Unsupported method "${method}"` } });
  } catch (err: any) {
    res.status(500).json({ jsonrpc: '2.0', id, error: { code: -32603, message: err.message || 'Internal RPC error' } });
  }
});
