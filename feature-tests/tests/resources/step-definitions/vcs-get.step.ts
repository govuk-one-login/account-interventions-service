import { loadFeatures, autoBindSteps } from 'jest-cucumber';
import { getVCsForUserId } from '../shared-steps/vc-get-shared.steps';

const features = loadFeatures('tests/resources/features/vcsGET/vcsGetUserId-*.feature');
autoBindSteps(features, [getVCsForUserId]);
