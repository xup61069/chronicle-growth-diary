export type ConnectionStatus = "online" | "offline";

export function getConnectionStatus(isOnline: boolean): ConnectionStatus {
  return isOnline ? "online" : "offline";
}

export function connectionStatusLabel(status: ConnectionStatus) {
  return status === "online" ? "連線中" : "離線草稿模式";
}
