// Polyfills for Node.js compatibility
if (typeof globalThis.File === 'undefined') {
  globalThis.File = class File {
    constructor(bits, name, options = {}) {
      this.name = name;
      this.lastModified = options.lastModified || Date.now();
      this.type = options.type || '';
      this.size = bits.length;
      this._bits = bits;
    }
    
    arrayBuffer() {
      return Promise.resolve(new ArrayBuffer(this.size));
    }
    
    stream() {
      // Simple stream implementation
      const self = this;
      return new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(self._bits));
          controller.close();
        }
      });
    }
    
    text() {
      return Promise.resolve(String.fromCharCode.apply(null, this._bits));
    }
    
    slice(start, end, contentType) {
      const slicedBits = this._bits.slice(start, end);
      return new File([slicedBits], this.name, { type: contentType });
    }
  };
}

// Polyfill for ReadableStream if not available
if (typeof globalThis.ReadableStream === 'undefined') {
  globalThis.ReadableStream = class ReadableStream {
    constructor(source) {
      this._source = source;
    }
    
    getReader() {
      return {
        read() {
          return Promise.resolve({ done: true, value: undefined });
        },
        releaseLock() {}
      };
    }
  };
}

module.exports = {};
