import { ErrorClassificationEntity } from './dist/entities/ErrorClassificationEntity.js';

const input = {
  'ignored': { 'nested': true },
  'retryable': 'true'
};

try {
  ErrorClassificationEntity.intake({ 'retryable': 'not-a-boolean' });
} catch (error) {
  console.log(`invalid: ${error.constructor.name} ${error.code}`);
}

console.log(`intake: ${JSON.stringify(ErrorClassificationEntity.intake(input))}`);
console.log(`original: ${JSON.stringify(input)}`);
