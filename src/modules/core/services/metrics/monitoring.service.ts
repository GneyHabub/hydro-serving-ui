import { Injectable } from '@angular/core';
import { HttpService } from '@core/services/http';
import { environment } from '@environments/environment';
import { SonarMetricData } from '@shared/_index';
import {
  MetricSpecification,
  IMetricSpecificationProvider,
} from '@shared/models/metric-specification.model';
import { IMonitoringAggregationList } from '@shared/models/monitoring-aggregation.model';
import { Observable, throwError } from 'rxjs';
import { map } from 'rxjs/operators';

export interface IMetricData {
  name: string;
  value: number;
  labels: {
    columnIndex: string;
    modelVersionId: string;
    trace?: any;
    traces?: any;
  };
  timestamp: number;
  health: any;
}

@Injectable()
export class MonitoringService {
  private baseMonitoringUrl: string;

  constructor(private http: HttpService) {
    this.baseMonitoringUrl = `${environment.monitoringUrl}`;
  }

  public getMetrics(
    options: {
      metricSpecification: MetricSpecification;
      interval: string;
      columnIndex?: string;
    }
  ): Promise<IMetricData[]> {
    const { modelVersionId, kind } = options.metricSpecification;

    const params: {
      modelVersionId: string,
      interval: string,
      metrics: string[],
      columnIndex?: string
    } = {
      modelVersionId: `${modelVersionId}`,
      interval: `${options.interval}`,
      metrics: this.getMetricsBySpecKind(kind),
    };

    if (options.columnIndex) {
      params.columnIndex = options.columnIndex;
    }

    return this.http
      .get(`${this.baseMonitoringUrl}/metrics`, { params })
      .pipe(map((res: Response): any => res))
      .toPromise();
  }

  // TODO: do not work
  public getHealth() {
    return this.http
      .get(`${this.baseMonitoringUrl}/health`)
      .pipe(map((res: Response): any => res))
      .toPromise();
  }

  public getAggregation(
    modelVersionId: string,
    metrics: string[],
    optional: {
      from?: string;
      till?: string;
      steps?: string;
    } = {}
  ): Observable<IMonitoringAggregationList> {
    return this.http.get(`${this.baseMonitoringUrl}/metrics/aggregation`, {
      params: {
        modelVersionId,
        metrics,
        ...optional,
      },
    });
  }

  public getMetricsInRange(
    metric: MetricSpecification,
    optional: {
      from?: string;
      till?: string;
      columnIndex?: string;
      health?: string;
    } = {}
  ): Observable<SonarMetricData[]> {
    try {
      const { modelVersionId: mv, kind } = metric;
      const params = {
        modelVersionId: `${mv}`,
        metrics: this.getMetricsBySpecKind(kind),
        ...optional,
      };

      return this.http.get(`${this.baseMonitoringUrl}/metrics/range`, {params});
    } catch (error) {
      throwError(error);
    }
  }

  public getMonitoringServiceStatus() {
    return this.http.get(`${this.baseMonitoringUrl}/buildinfo`);
  }

  public getMetricsBySpecKind(spec: string): string[] {
    const dict = {
      CounterMetricSpec: ['counter'],
      KSMetricSpec: ['kolmogorovsmirnov', 'kolmogorovsmirnov_level'],
      AEMetricSpec: ['autoencoder_reconstructed'],
      ImageAEMetricSpec: ['image_autoencoder_reconstructed'],
      RFMetricSpec: ['randomforest'],
      GANMetricSpec: ['gan_outlier', 'gan_inlier'],
      LatencyMetricSpec: ['latency'],
      ErrorRateMetricSpec: ['error_rate'],
      AccuracyMetricSpec: ['accuracy'],
    };

    return dict[spec];
  }

  public getSpecKindByMetricName(metricName: string) {
    const dict = {
      counter: 'CounterMetricSpec',
      kolmogorovsmirnov: 'KSMetricSpec',
      kolmogorovsmirnov_level: 'KSMetricSpec',
      autoencoder_reconstructed: 'AEMetricSpec',
      image_autoencoder_reconstructed: 'ImageAEMetricSpec',
      randomforest: 'RFMetricSpec',
      gan_outlier: 'GANMetricSpec',
      gan_inlier: 'GANMetricSpec',
      latency: 'LatencyMetricSpec',
      error_rate: 'ErrorRateMetricSpec',
      accuracy: 'AccuracyMetricSpec',
    };

    return dict[metricName];
  }

  public createMetricProviders(
    metricSpecification: MetricSpecification
  ): IMetricSpecificationProvider {
    return {
      kind: metricSpecification.kind,
      byModelVersionId: {
        [metricSpecification.modelVersionId]: metricSpecification,
      },
      metrics: this.getMetricsBySpecKind(metricSpecification.kind),
    };
  }
}
