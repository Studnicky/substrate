import type { CloudWatchLogSchemaFieldsEntity } from '../entities/CloudWatchLogSchemaFieldsEntity.js';
import type { OperationLogMetadataInterface } from './OperationLogMetadataInterface.js';

/** Readonly CloudWatch log record contract. */
export interface LogSchemaInterface extends OperationLogMetadataInterface {
  readonly 'level': CloudWatchLogSchemaFieldsEntity.Type['level'];
  readonly 'msg': CloudWatchLogSchemaFieldsEntity.Type['msg'];
  readonly 'service': CloudWatchLogSchemaFieldsEntity.Type['service'];
  readonly 'time': CloudWatchLogSchemaFieldsEntity.Type['time'];
}
