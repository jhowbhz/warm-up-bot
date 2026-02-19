import { Migration } from './runner';
import migration001 from './001_initial_schema';

const migrations: Migration[] = [
  migration001,
];

export default migrations;
