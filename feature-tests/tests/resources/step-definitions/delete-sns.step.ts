import { loadFeatures, autoBindSteps } from 'jest-cucumber';
import { deleteSnsMethod } from '../shared-steps/sns-shared.steps';

const features = loadFeatures('tests/resources/features/snsDelete/snsDeleteUserId-*.feature');
autoBindSteps(features, [deleteSnsMethod]);
