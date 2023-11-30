/**
 * Helper file to whirl up the tracer class and export it for ease of use.
 */
import { Tracer } from '@aws-lambda-powertools/tracer';
const tracer = new Tracer();

export default tracer;
