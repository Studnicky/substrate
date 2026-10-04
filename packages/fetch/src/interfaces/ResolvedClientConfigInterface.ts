/**
 * Client configuration after `FetchClientConfiguration.intake()` has parsed and validated it.
 */

import type { ClockProviderInterface } from '@studnicky/clock/interfaces';
import type { SignalInterface } from '@studnicky/signal/interfaces';

import type { ClientConfigDataEntity } from '../entities/ClientConfigDataEntity.js';
import type { DispatcherConfigEntity } from '../entities/DispatcherConfigEntity.js';
import type { FetchOptionsInterface } from './FetchOptionsInterface.js';
import type { QueryParametersInterface } from './QueryParametersInterface.js';
import type { RequestIdGeneratorInterface } from './RequestIdGeneratorInterface.js';

/**
 * Validated client configuration held internally after intake.
 */
export interface ResolvedClientConfigInterface {
  'autoGenerateRequestId'?: ClientConfigDataEntity.Type['autoGenerateRequestId'];
  'baseURL'?: ClientConfigDataEntity.Type['baseURL'];
  'clock'?: ClockProviderInterface;
  'dispatcher'?: DispatcherConfigEntity.Type;
  'headers'?: ClientConfigDataEntity.Type['headers'];
  'hookTimeoutMs'?: ClientConfigDataEntity.Type['hookTimeoutMs'];
  'metadata'?: ClientConfigDataEntity.Type['metadata'];
  'options'?: FetchOptionsInterface;
  'parameters'?: QueryParametersInterface;
  'requestIdGenerator'?: RequestIdGeneratorInterface;
  'signal'?: SignalInterface;
  'timeout'?: ClientConfigDataEntity.Type['timeout'];
}
