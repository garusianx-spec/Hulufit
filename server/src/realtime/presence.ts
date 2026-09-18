/**
 * Connection-counted presence.
 *
 * A user is online while at least one socket is attached — counting rather than
 * flag-flipping is what keeps a second tab, or a reconnect that races the old
 * socket's disconnect, from reporting them offline.
 *
 * Single-process by design. Behind more than one node, back this with the
 * Redis adapter and a shared hash; the interface does not change.
 */
export class PresenceTracker {
  private sockets = new Map<string, Set<string>>();
  private lastSeen = new Map<string, string>();

  /** @returns true when this is the user's first connection (online edge). */
  add(userId: string, socketId: string): boolean {
    const set = this.sockets.get(userId) ?? new Set<string>();
    const wasEmpty = set.size === 0;
    set.add(socketId);
    this.sockets.set(userId, set);
    this.lastSeen.set(userId, new Date().toISOString());
    return wasEmpty;
  }

  /** @returns true when the user's last connection went away (offline edge). */
  remove(userId: string, socketId: string): boolean {
    const set = this.sockets.get(userId);
    if (!set) return false;
    set.delete(socketId);
    this.lastSeen.set(userId, new Date().toISOString());
    if (set.size === 0) {
      this.sockets.delete(userId);
      return true;
    }
    return false;
  }

  isOnline(userId: string) {
    return (this.sockets.get(userId)?.size ?? 0) > 0;
  }

  lastSeenAt(userId: string) {
    return this.lastSeen.get(userId) ?? new Date(0).toISOString();
  }

  onlineCount() {
    return this.sockets.size;
  }

  socketCount() {
    let total = 0;
    for (const set of this.sockets.values()) total += set.size;
    return total;
  }
}
