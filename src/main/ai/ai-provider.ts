import type {
  AiModelOption,
  ImproveRequest,
  ImproveResult,
  AiProvider,
  TranslationRequest,
  TranslationResult,
} from "../../shared/types";

export interface AiServiceProvider {
  readonly name: Exclude<AiProvider, "auto">;
  isConfigured(apiKey: string): boolean;
  translate(
    req: TranslationRequest,
    apiKey: string,
    model: string,
  ): Promise<TranslationResult>;
  improve(
    req: ImproveRequest,
    apiKey: string,
    model: string,
  ): Promise<ImproveResult>;
  listModels(apiKey: string): Promise<AiModelOption[]>;
}
