import { isEmptyObj } from '@shared/utils/is-empty-object';
import { union } from 'lodash';

interface Check {
  checks: number;
  passed: number;
}

export class AggregationsList {
  aggregations: Aggregation[] = [];
  constructor(aggregations: Aggregation[]) {
    this.aggregations = aggregations;
  }

  get featureNames(): string[] {
    const firstAggregation = this.aggregations[0];
    if (firstAggregation) {
      return Object.keys(firstAggregation.featuresChecks);
    }
    return [];
  }

  get metricNames(): string[] {
    const firstAggregation = this.aggregations[0];
    if (firstAggregation) {
      return Object.keys(firstAggregation.metricsChecks);
    }
    return [];
  }

  get batchNames(): string[] {
    return this.aggregations
      .filter(agg => !isEmptyObj(agg.batchesChecks))
      .reduce((names, { batchesChecks }) => {
        return union(names, Object.keys(Object.values(batchesChecks)[0]));
      }, []);
  }

  get dateFrom(): Date | null {
    return null;
  }
  get dateTo(): Date | null {
    return null;
  }
}

export class Aggregation {
  from: any;
  to: any;
  id: string;
  hs_requests: number;
  modelVersionId: number;
  metricsChecks: { [metricName: string]: { checked: number; passed: number } };
  batchesChecks: {
    [featureName: string]: {
      [metricName: string]: { checked: number; passed: number };
    };
  };
  featuresChecks: { [featureName: string]: Check };
  constructor(params: any) {
    this.id = params._id;
    this.hs_requests = params._hs_requests || {};
    this.metricsChecks = params._hs_metrics || {};
    this.batchesChecks = params._hs_batch || {};
    this.featuresChecks = Aggregation.extractFeatureChecks(params);
    this.from = params._hs_first_id;
    this.to = params._hs_last_id;
    this.modelVersionId = params._hs_model_version_id;
  }

  private static extractFeatureChecks(
    params: any
  ): { [featureName: string]: Check } {
    const featuresChecks = Object.create(null);

    for (const featureNameKey in params) {
      if (params.hasOwnProperty(featureNameKey)) {
        if (!featureNameKey.startsWith('_')) {
          featuresChecks[featureNameKey] = params[featureNameKey];
        }
      }
    }

    return featuresChecks;
  }
}
