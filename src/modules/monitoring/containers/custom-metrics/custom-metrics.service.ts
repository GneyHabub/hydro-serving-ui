import { Injectable } from '@angular/core';
import { ChartConfig, CustomCheck, Check } from '@monitoring/interfaces';
import { MonitoringService } from '@monitoring/services';
import { MonitoringPageFacade } from '@monitoring/store/facades';
import { ModelVersion } from '@shared/_index';
import { BehaviorSubject, Observable, forkJoin, combineLatest, of } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';

export type ComparisonRegime = 'split' | 'merge';

@Injectable()
export class CustomMetricService {
  comparisonRegime$: Observable<ComparisonRegime>;
  comparableModelVersionsIds$: Observable<number[]>;
  comparableModelVersions$: Observable<ModelVersion[]>;
  comparableCustomMetricsByModelVersionId$: Observable<{
    [modelVersionId: string]: {
      [metricName: string]: {
        data: number[];
        name: string;
      };
    };
  }>;
  customMetrics$: Observable<Map<string, CustomCheck>>;

  chartConfigs$: Observable<Array<{ [metricName: string]: ChartConfig }>>;

  private comparableModelVersionsIds: BehaviorSubject<
    number[]
  > = new BehaviorSubject([]);

  private comparisonRegime: BehaviorSubject<
    ComparisonRegime
  > = new BehaviorSubject('merge' as ComparisonRegime);

  constructor(
    private facade: MonitoringPageFacade,
    private monitoring: MonitoringService
  ) {
    this.comparisonRegime$ = this.comparisonRegime.asObservable();
    this.comparableModelVersionsIds$ = this.comparableModelVersionsIds.asObservable();

    this.comparableModelVersions$ = this.comparableModelVersionsIds$.pipe(
      switchMap(ids => this.facade.idsToModelVersions$(ids))
    );

    this.customMetrics$ = this.facade.customChecks$;
    this.comparableCustomMetricsByModelVersionId$ = combineLatest(
      this.facade.selectedAggregation$,
      this.comparableModelVersionsIds
    ).pipe(
      switchMap(([selectedAggregation, ids]) => {
        const request: {
          [modelVersionId: number]: Observable<Check[]>;
        } = ids.reduce((req, id) => {
          req[id] = this.monitoring.getChecks({
            modelVersionId: id,
            from: selectedAggregation.additionalInfo._hs_first_id,
            to: selectedAggregation.additionalInfo._hs_last_id,
          });
          return req;
        }, {});
        return forkJoin(request);
      }),
      map((res: { [modelVersionId: number]: Check[] }) => {
        const result = {};
        for (const modelVersionId in res) {
          if (res.hasOwnProperty(modelVersionId)) {
            const checks = res[modelVersionId];
            if (result[modelVersionId] === undefined) {
              result[modelVersionId] = {};
            }
            checks.forEach(check => {
              const rawChecks = check._hs_metric_checks;

              for (const checkName in rawChecks) {
                if (rawChecks.hasOwnProperty(checkName)) {
                  const rawCheck = rawChecks[checkName];

                  if (result[modelVersionId][checkName] === undefined) {
                    result[modelVersionId][checkName] = { data: [], name: checkName};
                  }

                  result[modelVersionId][checkName].data.push(rawCheck.value);
                }
              }
            });
          }
        }

        return result;
      })
    );

    this.chartConfigs$ = combineLatest(
      this.customMetrics$,
      this.comparisonRegime$,
      this.comparableCustomMetricsByModelVersionId$
    ).pipe(
      map(([customMetrics, regime, compMetrics]) => {
        if (regime === 'split') {
          return this.splitChectToChartConfigs(customMetrics, compMetrics);
        } else {
          return this.mergeChecksToChartConfig(customMetrics, compMetrics);
        }
      })
    );
  }

  splitChectToChartConfigs(
    customCheks: Map<string, CustomCheck>,
    compCheksByModelVersionId: any
  ): Array<{ [metricName: string]: ChartConfig }> {
    const result = [];
    const size: ChartConfig['size'] = {
      width: 300,
      height: 240,
      margins: {
        left: 40,
        right: 20,
        top: 10,
        bottom: 24,
      },
    };

    const currentConfigs = {};
    for (const item of customCheks) {
      const [uid, check] = item;
      currentConfigs[check.name] = {
        size,
        data: {
          'adult_scalar:1': {
            color: 'blue',
            x: check.data.map((_, i) => i + 1),
            y: check.data,
          },
        },
        name: check.name,
        plotBands: [],
      };
    }

    result.push(currentConfigs);
    for (const modelVersionId in compCheksByModelVersionId) {
      if (compCheksByModelVersionId.hasOwnProperty(modelVersionId)) {
        const currentConfig = {} as any;
        const currentChecks = compCheksByModelVersionId[modelVersionId];
        for (const i in currentChecks) {
          if (currentChecks.hasOwnProperty(i)) {
            const check = currentChecks[i];
            if (currentConfig[check.name] === undefined) {
              currentConfig.name = {
                size,
                data: {
                  [modelVersionId]: {
                    color: 'blue',
                    x: check.data.map((_, i) => i + 1),
                    y: check.data,
                  },
                },
                name: check.name,
                plotBands: [],
              };
            }
          }
        }
        result.push(currentConfig);
      }
    }

    return result;
  }
  mergeChecksToChartConfig(
    customCheks: Map<string, CustomCheck>,
    compCheks: any
  ): Array<{ [metricName: string]: ChartConfig }> {
    const result: Array<{ [metricName: string]: ChartConfig }> = [{}];
    const size: ChartConfig['size'] = {
      width: 1080,
      height: 300,
      margins: {
        left: 40,
        right: 20,
        top: 10,
        bottom: 24,
      },
    };

    for (const item of customCheks) {
      const [uid, check] = item;
      if (result[0][check.name] === undefined) {
        result[0][check.name] = {
          size,
          data: {
            'adult_scalar:1': {
              color: 'blue',
              x: check.data.map((_, i) => i + 1),
              y: check.data,
            },
          },
          name: check.name,
          plotBands: [],
        };
      }
    }

    for (const modelVersionId in compCheks) {
      if (compCheks.hasOwnProperty(modelVersionId)) {
        const checks = compCheks[modelVersionId];
        for (const metricName in checks) {
          if (checks.hasOwnProperty(metricName)) {
            const check = checks[metricName];
            if (result[0][check.name] === undefined) {
              result[0].name = {
                size,
                data: {
                  [modelVersionId]: {
                    color: 'blue',
                    x: check.data.map((_, i) => i + 1),
                    y: check.data,
                  },
                },
                name: check.name,
                plotBands: [],
              };
            } else {
              result[0][check.name] = {
                ...result[0][check.name],
                data: {
                  ...result[0][check.name].data,
                  [modelVersionId]: {
                    color: 'red',
                    x: check.data.map((_, i) => i + 1),
                    y: check.data,
                  },
                },
              };
            }
          }
        }
      }
    }

    return result;
  }

  changeRegime(regime: ComparisonRegime): void {
    this.comparisonRegime.next(regime);
  }

  addComparableModelVersion(id: number): void {
    const currentList = this.comparableModelVersionsIds.getValue();
    this.comparableModelVersionsIds.next([...currentList, id]);
  }

  removeComparableModelVersion(removableId: number): void {
    const currentList = this.comparableModelVersionsIds.getValue();
    this.comparableModelVersionsIds.next(
      currentList.filter(idx => idx !== removableId)
    );
  }
}
