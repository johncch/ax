export class DynamicArrayIterator<T> implements Iterable<[number, T]> {
  private array: T[];
  private index: number = 0;

  constructor(initialArray: T[]) {
    this.array = [...initialArray];
  }

  *[Symbol.iterator](): Generator<[number, T], void, unknown> {
    while (this.index < this.array.length) {
      yield [this.index, this.array[this.index]];
      this.index++;
    }
  }

  addItem(item: T): void {
    this.array.splice(this.index + 1, 0, item);
  }

  get length(): number {
    return this.array.length;
  }
}
