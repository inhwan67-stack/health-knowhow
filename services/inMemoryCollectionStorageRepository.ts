import type {
  CollectionStorageCommand,
  SourceCandidateStorageCommand,
  TopicCandidateStorageCommand,
} from "./contentCollectionStorageCommand";

export type CollectionStorageRepositoryResult =
  | {
      status: "committed";
      operationId: string;
      fingerprint: string;
      storedEntityId: string;
      command: CollectionStorageCommand;
    }
  | {
      status: "replayed";
      operationId: string;
      fingerprint: string;
      storedEntityId: string;
      command: CollectionStorageCommand;
    }
  | {
      status: "rejected";
      operationId: string;
      code: "OPERATION_PAYLOAD_MISMATCH" | "DUPLICATE_CANDIDATE";
      reason: string;
      existingEntityId?: string;
    };

export type CollectionStorageRepositoryPort = {
  saveTopicCandidate(command: TopicCandidateStorageCommand): Promise<CollectionStorageRepositoryResult>;
  saveSourceCandidate(command: SourceCandidateStorageCommand): Promise<CollectionStorageRepositoryResult>;
  listTopicCandidates(): TopicCandidateStorageCommand[];
  listSourceCandidates(): SourceCandidateStorageCommand[];
};

type StoredOperation = {
  operationId: string;
  fingerprint: string;
  storedEntityId: string;
  command: CollectionStorageCommand;
};

export class InMemoryCollectionStorageRepository implements CollectionStorageRepositoryPort {
  private readonly topicCandidates = new Map<string, TopicCandidateStorageCommand>();
  private readonly sourceCandidates = new Map<string, SourceCandidateStorageCommand>();
  private readonly operations = new Map<string, StoredOperation>();
  private nextTopicId = 1;
  private nextSourceId = 1;

  async saveTopicCandidate(
    command: TopicCandidateStorageCommand,
  ): Promise<CollectionStorageRepositoryResult> {
    return this.saveCandidate({
      command,
      store: this.topicCandidates,
      entityId: `topic-candidate-${this.nextTopicId}`,
      advanceId: () => {
        this.nextTopicId += 1;
      },
    });
  }

  async saveSourceCandidate(
    command: SourceCandidateStorageCommand,
  ): Promise<CollectionStorageRepositoryResult> {
    return this.saveCandidate({
      command,
      store: this.sourceCandidates,
      entityId: `source-candidate-${this.nextSourceId}`,
      advanceId: () => {
        this.nextSourceId += 1;
      },
    });
  }

  listTopicCandidates(): TopicCandidateStorageCommand[] {
    return Array.from(this.topicCandidates.values());
  }

  listSourceCandidates(): SourceCandidateStorageCommand[] {
    return Array.from(this.sourceCandidates.values());
  }

  private saveCandidate<TCommand extends CollectionStorageCommand>({
    command,
    store,
    entityId,
    advanceId,
  }: {
    command: TCommand;
    store: Map<string, TCommand>;
    entityId: string;
    advanceId: () => void;
  }): CollectionStorageRepositoryResult {
    const operation = this.operations.get(command.operationId);

    if (operation) {
      if (operation.fingerprint !== command.fingerprint) {
        return {
          status: "rejected",
          operationId: command.operationId,
          code: "OPERATION_PAYLOAD_MISMATCH",
          reason: "operationId already exists with a different fingerprint.",
          existingEntityId: operation.storedEntityId,
        };
      }

      return {
        status: "replayed",
        operationId: command.operationId,
        fingerprint: command.fingerprint,
        storedEntityId: operation.storedEntityId,
        command: operation.command,
      };
    }

    const existingDuplicate = store.get(command.provenance.duplicateKey);
    if (existingDuplicate) {
      return {
        status: "rejected",
        operationId: command.operationId,
        code: "DUPLICATE_CANDIDATE",
        reason: "duplicateKey already exists in this candidate storage area.",
        existingEntityId: existingDuplicate.operationId,
      };
    }

    // Single mutation boundary: all validation above happens before maps change.
    store.set(command.provenance.duplicateKey, command);
    this.operations.set(command.operationId, {
      operationId: command.operationId,
      fingerprint: command.fingerprint,
      storedEntityId: entityId,
      command,
    });
    advanceId();

    return {
      status: "committed",
      operationId: command.operationId,
      fingerprint: command.fingerprint,
      storedEntityId: entityId,
      command,
    };
  }
}

