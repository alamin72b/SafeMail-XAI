export class LruCache<K, V> {
  private readonly entries = new Map<K, V>();

  public constructor(private readonly capacity: number) {
    if (capacity < 1) {
      throw new Error('LruCache capacity must be at least 1.');
    }
  }

  public get(key: K): V | undefined {
    const value = this.entries.get(key);
    if (value === undefined) {
      return undefined;
    }
    this.entries.delete(key);
    this.entries.set(key, value);
    return value;
  }

  public set(key: K, value: V): void {
    if (this.entries.has(key)) {
      this.entries.delete(key);
    }
    this.entries.set(key, value);
    if (this.entries.size > this.capacity) {
      const oldest = this.entries.keys().next();
      if (!oldest.done) {
        this.entries.delete(oldest.value);
      }
    }
  }
}