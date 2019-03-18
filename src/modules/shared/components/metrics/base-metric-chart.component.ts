import {
    Component,
    OnInit,
    Output,
    EventEmitter,
    Input,
    ElementRef,
    ViewChild,
    OnChanges,
    SimpleChanges,
    OnDestroy } from '@angular/core';
import * as Highcharts from 'highcharts';
import * as HighchartsNoDataToDisplay from 'highcharts/modules/no-data-to-display.src';
import * as moment from 'moment';

import { IChartData } from '@shared/models/application-chart.model';

import { Subscription, Subject, Observable, interval, combineLatest, BehaviorSubject } from 'rxjs';
import {
    switchMap,
    tap,
    startWith
} from 'rxjs/operators';

import { InfluxDBService } from '@core/services';
import { MetricsService } from '@core/services/metrics/metrics.service';
import { ReqstoreService } from '@core/services/reqstore.service';
import { IMetricSpecificationProvider, IMetricSpecification } from '@shared/models/metric-specification.model';
import { isArray } from 'util';

interface IMetricData {
    name: string;
    value: number;
    labels: {
        modelVersionId: string;
        trace?: any;
        traces?: any;
    };
    timestamp: number;
    health: any;
}

@Component({
    selector: 'hs-base-metric-chart',
    templateUrl: './base-metric-chart.component.html',
    styleUrls: ['./base-metric-chart.component.scss'],    // changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BaseMetricChartComponent implements OnInit, OnChanges, OnDestroy {
    @Input()
    public chartData: IChartData;

    @Input()
    public metricSpecificationProviders;

    public metricsByModelVersion: { [modelVersion: string]: string[] };
    public makeRequest: Subject<Array<Promise<IMetricData[]>>> = new Subject();
    public requests: Array<Promise<any>>;

    public showDeleteIcon;

    public dateFrom;
    public dateTo;

    @Input()
    set canDelete(canDelete: boolean) {
        this.showDeleteIcon = canDelete || false;
    }

    @Input()
    protected chartTimeWidth: number = 0;

    @Input()
    protected modelVersionId;

    protected metrics: string[] = [];
    protected metricSpecId: string;
    protected metricSpecKind: string;
    protected REQUEST_DELAY_MS: number = 2000;
    protected updateChartObservable$: Observable<any>;
    protected timeSubject: Subject<any> = new Subject<any>();
    protected providersSubject: Subject<any> = new Subject<any>();

    @Output()
    private delete: EventEmitter<any> = new EventEmitter();

    @ViewChild('chartContainer')
    private chartContainerRef: ElementRef;

    // chart
    private chart: Highcharts.ChartObject;
    private chartBands: { [metricName: string]: string[] } = {};
    private plotBands: { [metricName: string]: Array<{from: number, to: number}> } = {};
    private series: { [metricName: string]: {name: string; data: Array<{x: any, y: any, name: any}>}} = {};

    // common data
    private metricsData: IMetricData[] = [];
    private thresholds: {[uniqName: string]: number} = {};
    private updateChartSub: Subscription;

    private selectSeriesPoint$: Subject<any> = new Subject();

    constructor(
        public metricsService: MetricsService,
        public influxdbService: InfluxDBService,
        public reqstore: ReqstoreService
    ) {
        this.updateChartObservable$ = combineLatest(
            this.timeSubject.asObservable(),
            this.providersSubject.asObservable(),
            interval(this.REQUEST_DELAY_MS).pipe(startWith('first tick'))
        );

        this.selfUpdate();
        this.selectSeriesPoint$.subscribe(_ => {
            const x = JSON.parse(_);
            let value = isArray(x) ? x[0] : x;

            value = value.split('_')[0];
            if (this.dateFrom) {
                this.dateTo = value;
            } else {
                this.dateFrom = value;
            }
        });
    }

    ngOnInit(): void {
        this.initChart();
    }

    ngOnDestroy(): void {
        this.updateChartSub.unsubscribe();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.chartTimeWidth) {
            this.timeSubject.next(changes.chartTimeWidth.currentValue);
        }

        if (changes.metricSpecificationProviders) {
            this.initThresholds();
            this.providersSubject.next(changes.metricSpecificationProviders.currentValue);
        }
    }

    public initThresholds() {
        const newThresholds = {};
        const data = Object.entries(this.metricSpecificationProviders.byModelVersionId);

        data.forEach(([modelVerId, metricSpec]: [string, IMetricSpecification]) => {
            const uniqName = `${modelVerId}_threshold`;
            if (newThresholds[uniqName] === undefined && metricSpec.config.threshold) {
                newThresholds[uniqName] = metricSpec.config.threshold;
            }
        });
        this.thresholds = newThresholds;
    }

    public onDelete(): void {
        const { id } = this.metricSpecificationProviders.byModelVersionId[this.modelVersionId];

        this.delete.emit(id);
    }

    protected getRequestPromise(id, i, metrics): Promise<IMetricData[]> {
        return this.metricsService.getMetrics(
            id.toString(),
            i,
            metrics,
            ''
        );
    }

    private initChart(): void {
        const self = this;

        HighchartsNoDataToDisplay(Highcharts);
        this.chart = Highcharts.chart(this.chartContainerRef.nativeElement, {
            credits: {
                enabled: false,
            },
            chart: {
                type: 'spline',
                animation: false,
            },
            title: {
                text: '',
            },
            xAxis: {
                title: {
                    text: 'Time',
                },
                type: 'datetime',
                gridLineWidth: 1,
                max: new Date().getTime(),
                min: moment().subtract(this.chartTimeWidth / 60000, 'minutes').valueOf(),
            },
            yAxis: {
                title: {
                    text: this.metrics.join(','),
                },
            },
            tooltip: {
                shared: true,
            },
            plotOptions: {
                series: {
                    cursor: 'pointer',
                    point: {
                        events: {
                            click() {
                                self.selectSeriesPoint$.next(this.options.key);
                                return true;
                            },
                            select: () => true,
                        },
                    },
                },
                column: {
                    grouping: false,
                    shadow: false,
                    borderWidth: 0,
                },
            },
            lang: {
                noData: 'Waiting for data...',
            },
            noData: {
                style: {
                    fontWeight: 'bold',
                    fontSize: '15px',
                    color: '#a0a0a0',
                },
            },
        });
    }

    get title(): string {
        return this.metricSpecificationProviders.kind;
    }

    private drawSeries(): void {
        const chartSeries = this.chart.series;
        const seriesNames = Object.keys(this.series);
        // clear series
        chartSeries.forEach(curChartSeries => {
            if (!seriesNames.includes(curChartSeries.name)) {
                curChartSeries.remove(true);
            }
        });

        Object.entries(this.series).forEach(([name, series]) => {
            const currentSeriesOnChart = chartSeries.find(_ => _.name === name);
            if (currentSeriesOnChart) {
                this.chart
                    .xAxis[0]
                    .setExtremes(
                        moment().subtract(this.chartTimeWidth / 60000, 'minutes').valueOf(),
                        moment().valueOf(),
                        false
                );
                currentSeriesOnChart.update(series, true);
            } else {
                this.chart.addSeries(series, true);
            }
        });
    }

    private drawBands(): void {
        const plotBandsEntries = Object.entries(this.plotBands);
        const chartBandsEntries = Object.entries(this.chartBands);

        chartBandsEntries.forEach(([_, ids]) =>
            ids.forEach(id => this.chart.xAxis[0].removePlotBand(id))
        );

        if (plotBandsEntries.length > 0 ) {
            plotBandsEntries.forEach(([metricName, plotBandList]) => {
                plotBandList.forEach(({from, to}) => {
                    if (this.chartBands[metricName] === undefined) {
                        this.chartBands[metricName] = [];
                    }
                    const id = `${from}_${to}`;
                    this.chartBands[metricName].push(id);
                    this.chart.xAxis[0].addPlotBand({
                        from: from * 1000,
                        to: to * 1000,
                        color: 'rgba(176, 0, 32, 0.2)',
                        id,
                    });
                });
            });
        }
    }

    private drawThresholds(): void {
        const thresholds = Object.entries(this.thresholds);
        const thresholdsNames = Object.keys(this.thresholds);
        const isThreshold = ({name}: Highcharts.SeriesObject): boolean => /^.+_threshold$/.test(name);
        const currentChartThresholdSeries = this.chart.series.filter(isThreshold);

        if (thresholds.length && currentChartThresholdSeries.length) {
            currentChartThresholdSeries.forEach(series => series.remove(true));
            } else {
            // TODO: лишняя проверка можно оптимизнуть
            // все перенести в стримы
            currentChartThresholdSeries.forEach(series => {
                if (!thresholdsNames.includes(series.name)) {
                    series.remove(true);
                }
            });

            thresholds.forEach(([thresholdName, value]) => {
                const thresholdAreadyDraw = currentChartThresholdSeries.find(({name}) => name === thresholdName);
                if (!thresholdAreadyDraw) {
                    this.chart.yAxis[0].addPlotLine({
                        color: 'red',
                        dashStyle: 'scatter',
                        value,
                        width: 2,
                    });
                }
            });
        }
    }

    private fetchMetricsData(): void {
        if (this.metricsData.length === 0) {
            return;
        }

        const newSeries: { [metricName: string]: {name: string; data: Array<{x: any, y: any, name: any, key: any}>}} = {};
        const newPlotBands: {[metricName: string]: Array<{from: number, to: number}>} = {};

        let tmpBandObject = null;

        for (let i = 0, l = this.metricsData.length; i < l; i++) {
            const isLastElement = i === l - 1;
            const currentMetricData = this.metricsData[i];
            const { name, timestamp, value, health, labels } = currentMetricData;

            const uniqName = `${name}_version_${labels.modelVersionId}`;

            // series
            if (newSeries[uniqName] === undefined ) {
               newSeries[uniqName] = { name: uniqName, data: [] };
            }

            newSeries[uniqName].data.push({
                x: timestamp * 1000,
                y: value,
                name: timestamp,
                key: labels.trace || labels.traces,
            });

            // plotBands
            if (newPlotBands[uniqName] === undefined ) {
                newPlotBands[uniqName] = [];
            }

            if (tmpBandObject) {
                if (health === false) {
                    tmpBandObject.to = timestamp;
                 }
                if (health === true || isLastElement) {
                    newPlotBands[uniqName].push(Object.assign({}, tmpBandObject));
                    tmpBandObject = null;
                }
            } else {
                if (health === true) { continue; }
                if (health === false) {
                    tmpBandObject = { from: timestamp, to: timestamp };
                }
            }
        }

        this.series = newSeries;
        this.plotBands = newPlotBands;
    }

    private selfUpdate() {
        this.updateChartSub = this.updateChartObservable$.pipe(
            switchMap(([time, providers]) => {
                const {
                    byModelVersionId,
                    metrics,
                }: IMetricSpecificationProvider = providers;
                const requests = [];

                Object.values(byModelVersionId).forEach(metricSpecification => {
                    requests.push(this.getRequestPromise(metricSpecification.modelVersionId, time, metrics));
                });

                return combineLatest(...requests);
            }),
            tap(([primaryMetricData, comparedMetricData]: [IMetricData[], IMetricData[]]) => {
                this.metricsData = primaryMetricData.concat(comparedMetricData || []);
            }),
            tap(_ => this.redrawChart())
        ).subscribe();
    }

    private redrawChart() {
        this.fetchMetricsData();
        this.drawSeries();
        this.drawThresholds();
        this.drawBands();
    }
}
