import type { ModelContextLike } from './register-tools';

declare global {
  interface Document {
    modelContext?: ModelContextLike;
  }
}

export {};

