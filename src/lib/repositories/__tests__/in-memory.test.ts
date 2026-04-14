import { InMemoryRepository } from '../in-memory-repository';
import { runRepositoryContract } from './contract';

runRepositoryContract('InMemoryRepository', () => new InMemoryRepository());
