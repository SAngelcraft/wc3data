import MpqHash from './hash';
import {HASH_TABLE_KEY, HASH_TABLE_INDEX, HASH_NAME_A, HASH_NAME_B} from './constants';

/**
 * A MPQ hash table.
 */
export default class MpqHashTable {
  /**
   * @param {MpqCrypto} c
   */
  constructor(c) {
    /** @param {MpqCrypto} */
    this.c = c;
    /** @param {Array<MpqHash>} */
    this.entries = [];

    // Minimum size
    this.addEmpties(4);
  }

  /**
   *
   */
  clear() {
    this.entries.length = 0;
  }

  /**
   * @param {number} howMany
   */
  addEmpties(howMany) {
    for (let i = 0; i < howMany; i++) {
      this.entries.push(new MpqHash());
    }
  }

  /**
   * @param {string} name
   * @return {number}
   */
  getInsertionIndex(name) {
    let entries = this.entries;
    let offset = this.c.hash(name, HASH_TABLE_INDEX) & (entries.length - 1);

    for (let i = 0, l = entries.length; i < l; i++) {
      let index = (i + offset) % l;
      let hash = entries[index];

      if (hash.platform === 0xFFFF) {
        return index;
      }
    }

    return -1;
  }

  /**
   * @param {string} name
   * @param {number} blockIndex
   * @return {MpqHash}
   */
  add(name, blockIndex) {
    let insertionIndex = this.getInsertionIndex(name);

    if (insertionIndex !== -1) {
      let hash = this.entries[insertionIndex];

      hash.nameA = this.c.hash(name, HASH_NAME_A);
      hash.nameB = this.c.hash(name, HASH_NAME_B);
      hash.locale = 0;
      hash.platform = 0;
      hash.blockIndex = blockIndex;

      return hash;
    }
  }

  /**
   * @param {Uint8Array} typedArray
   */
  load(typedArray) {
    let entriesCount = typedArray.byteLength / 16;
    let uint32array = new Uint32Array(this.c.decryptBlock(typedArray, HASH_TABLE_KEY).buffer);
    let offset = 0;

    // Clear the table and add the needed empties.
    this.clear();
    this.addEmpties(entriesCount);

    for (let hash of this.entries) {
      hash.load(uint32array.subarray(offset, offset + 4));

      offset += 4;
    }
  }

  /**
   * @param {Uint8Array} typedArray
   */
  save(typedArray) {
    let uint32array = new Uint32Array(this.entries.length * 4);
    let offset = 0;

    for (let hash of this.entries) {
      hash.save(uint32array.subarray(offset, offset + 4));

      offset += 4;
    }

    let uint8array = new Uint8Array(uint32array.buffer);

    this.c.encryptBlock(uint8array, HASH_TABLE_KEY);

    typedArray.set(uint8array);
  }

  /**
   * @param {string} name
   * @return {MpqHash|null}
   */
  get(name) {
    let c = this.c;
    let entries = this.entries;
    let offset = c.hash(name, HASH_TABLE_INDEX) & (entries.length - 1);
    let nameA = c.hash(name, HASH_NAME_A);
    let nameB = c.hash(name, HASH_NAME_B);

    for (let i = 0, l = entries.length; i < l; i++) {
      let hash = entries[(i + offset) % l];

      if (nameA === hash.nameA && nameB === hash.nameB) {
        return hash;
      } else if (hash.blockIndex === 0xFFFFFFFF) {
        return null;
      }
    }

    return null;
  }
}
