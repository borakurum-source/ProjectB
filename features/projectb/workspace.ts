export interface WorkspaceClient {
  id: string;
}

export function selectActiveClient<T extends WorkspaceClient>(
  clients: T[],
  activeClientId: string,
): T | undefined {
  return clients.find((client) => client.id === activeClientId) ?? clients[0];
}
