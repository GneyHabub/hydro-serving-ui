import { Injectable } from '@angular/core';
import {
  Aggregation,
  MetricCheckAggregation,
  Check,
  ChartConfig,
  CheckCollection,
} from '@app/modules/monitoring/models';
import { combineLatest, forkJoin, Observable, of } from 'rxjs';
import { map, switchMap, startWith, shareReplay, tap } from 'rxjs/operators';

import { ModelVersion, MetricSpecification } from '@app/core/data/types';
import { ColorPaletteService } from '@app/core/color-palette.service';

import { MonitoringService } from '../../services';

import { MetricsFacade } from '../../store/facades/metrics.facade';
import { MetricChartsState } from '../../store/metric-charts.state';
import { MonitoringFacade } from '../../store/monitoring.facade';

export type ComparisonRegime = 'split' | 'merge';

@Injectable()
export class CustomMetricsFacade {
  private readonly chartConfigs$: Observable<ChartConfig[]>;
  private curMetricChecks$: Observable<MetricCheckAggregation[]>;
  private compMetricChecks$: Observable<MetricCheckAggregation[]>;
  private allMetricChecks$: Observable<MetricCheckAggregation[]>;

  selectedMetrics$: Observable<any>;

  constructor(
    private metricsFacade: MetricsFacade,
    private monitoringFacade: MonitoringFacade,
    private monitoringApi: MonitoringService,
    private colorPalette: ColorPaletteService,
    private state: MetricChartsState
  ) {
    this.selectedMetrics$ = this.metricsFacade.getSelectedMetrics();

    this.curMetricChecks$ = this.monitoringFacade.getChecks().pipe(
      map(checks => (checks ? [...checks.getMetricsChecks().values()] : [])),
      shareReplay(1)
    );

    this.compMetricChecks$ = combineLatest([
      this.state.getModelVersionsToCompare(),
      this.monitoringFacade.getSelectedAggregation(),
    ]).pipe(
      switchMap(([modelVersions, aggregation]) => {
        if (modelVersions.length === 0) return of([]);

        return this.loadComparableChecks(aggregation, modelVersions).pipe(
          map(response => {
            return Object.values(response).reduce((acc, checkCollection) => {
              return [...acc, ...checkCollection.getMetricsChecks().values()];
            }, []);
          })
        );
      }),
      startWith([]),
      shareReplay(1)
    );

    this.allMetricChecks$ = combineLatest([
      this.curMetricChecks$,
      this.compMetricChecks$,
    ]).pipe(map(([current, comp]) => [...current, ...comp]));

    this.chartConfigs$ = combineLatest([
      this.selectedMetrics$,
      this.allMetricChecks$,
    ]).pipe(
      map(([metrics, checks]) =>
        generateConfigs(metrics, checks, this.colorPalette)
      ),
      shareReplay(1)
    );
  }

  getChartConfigs(): Observable<ChartConfig[]> {
    return this.chartConfigs$;
  }

  comparableModelVersionsChanged(modelVersions: ModelVersion[]): void {
    this.state.addModelVersionToCompare(modelVersions);
  }

  getModelVersionsToCompare(): Observable<ModelVersion[]> {
    return this.state.getModelVersionsToCompare();
  }

  getCustomMetrics() {
    return this.metricsFacade.getSelectedMetrics();
  }

  private loadComparableChecks(
    aggregation: Aggregation,
    comparedModelVersions: ModelVersion[]
  ): Observable<{
    [modelVersionId: number]: CheckCollection;
  }> {
    const request: {
      [modelVersionId: number]: Observable<CheckCollection>;
    } = comparedModelVersions.reduce((request, { id }) => {
      request[id] = this.monitoringApi
        .getChecksForComparision({
          originalModelVersion: aggregation.modelVersionId,
          aggregationId: aggregation.id,
          comparedModelVersionId: id,
        })
        .pipe(
          map(bareChecks => {
            const checks = bareChecks.map(bareCheck => new Check(bareCheck));
            return new CheckCollection(checks);
          })
        );
      return request;
    }, {});
    return forkJoin(request);
  }
}

function buildPlotBands(
  health: boolean[]
): Array<{ from: number; to: number }> {
  let currentBand: { from: number; to: number };
  const res = [];
  health.forEach((check, idx) => {
    if (!check) {
      if (currentBand) {
        currentBand.to = idx + 1;
      } else {
        currentBand = { from: idx + 1, to: idx + 1 };
      }
    } else {
      if (currentBand) {
        res.push({ ...currentBand });
        currentBand = undefined;
      }
    }
  });

  if (currentBand) {
    res.push({ ...currentBand });
  }

  return res;
}

function defaultConfig(name, threshold?): ChartConfig {
  return {
    name,
    threshold,
    size: {
      margins: {
        left: 40,
        right: 12,
        top: 2,
        bottom: 16,
      },
    },
    series: [],
  };
}

function generateConfigs(
  metrics: MetricSpecification[],
  metricCheckAgg: MetricCheckAggregation[],
  palette: ColorPaletteService
): ChartConfig[] {
  if (metrics.length === 0) return [];

  // Create configs for MetricSpecs first
  const configs: ChartConfig[] = metrics.map(
    ({ name, config: { threshold } }) => defaultConfig(name, threshold)
  );

  // Iterate over MetricCheckAggregations and create(update) charts
  metricCheckAgg.forEach(cur => {
    let config = configs.find(cfg => cfg.name === cur.metricName);

    if (config === undefined) {
      config = defaultConfig(cur.metricName);
      configs.push(config);
    }

    config.series.push({
      name: `${cur.metricName}_${cur.modelVer}`,
      data: cur.values,
      color: palette.getPalette()[config.series.length],
    });

    // Shouldn't calculate threshold and plotbands for multi series
    if (config.series.length > 1) {
      config.threshold = undefined;
      config.plotBands = undefined;
    } else {
      if (config.threshold === undefined) {
        config.threshold = cur.threshold;
      }
      if (config.plotBands === undefined) {
        config.plotBands = buildPlotBands(cur.checks);
      }
    }
  });

  return configs;
}
