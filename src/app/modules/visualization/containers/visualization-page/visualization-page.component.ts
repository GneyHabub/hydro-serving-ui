import { Component, OnInit } from '@angular/core';
import { ScatterPlotData } from '../../models/scatter-plot-data.model';
import { Observable } from 'rxjs';
import { ModelVersion } from '@app/core/data/types';

import { Check } from '../../../monitoring/models';

import { Colorizer, VisualizationParams, LinkRegime } from '../../models';
import { VisualizationFacade } from '../../visualization.facade';
import { VisualizationState } from '../../store';

@Component({
  selector: 'hs-visualization',
  templateUrl: './visualization-page.component.html',
  styleUrls: ['./visualization-page.component.scss'],
  providers: [VisualizationState, VisualizationFacade],
})
export class VisualizationPageComponent implements OnInit {
  selectedCheck$: Observable<Check>;
  modelVersion$: Observable<ModelVersion>;
  taskId$: Observable<string>;
  status$: Observable<string>;
  result$: Observable<any>;
  error$: Observable<string | null>;
  colors$: Observable<string[]>;
  top100$: Observable<number[][]>;
  counterfactuals$: Observable<number[][]>;
  scatterPlotData$: Observable<ScatterPlotData>;
  colorizers$: Observable<Colorizer[]>;
  colorizer$: Observable<Colorizer>;
  visualizationMetrics$: Observable<{ [name: string]: string }>;
  selectedId$: Observable<string>;
  message$: Observable<string>;
  linkRegime: LinkRegime = 'nearest';
  showTrainData: boolean;
  params$: Observable<VisualizationParams>;

  constructor(private service: VisualizationFacade) {}

  ngOnInit(): void {
    this.taskId$ = this.service.getTaskId();
    this.status$ = this.service.getStatus();
    this.result$ = this.service.getResult();
    this.scatterPlotData$ = this.service.getScatterPlotData();
    this.error$ = this.service.getError();
    this.colors$ = this.service.getColors();
    this.top100$ = this.service.getTop100();
    this.modelVersion$ = this.service.getModelVersion();
    this.selectedCheck$ = this.service.getSelectedCheck();
    this.colorizers$ = this.service.getColorizers();
    this.colorizer$ = this.service.getSelectedColorizer();
    this.counterfactuals$ = this.service.getCounterfactuals();
    this.visualizationMetrics$ = this.service.getVisualizationMetrics();
    this.selectedId$ = this.service.getSelectedId();
    this.message$ = this.service.getMessage();
    this.params$ = this.service.getParams();

    this.service.loadEmbedding();
  }

  handleSelectPoint(index: number) {
    this.service.changeSelectedPointIndex(index);
  }

  onChangeColorizer(colorizer: Colorizer): void {
    this.service.changeColorizer(colorizer);
  }

  retryRequest(): void {
    this.service.loadEmbedding();
  }

  onChangeShowTrainData(value: boolean) {
    this.showTrainData = value;
  }

  onRefit(visParams: VisualizationParams) {
    this.service.refit(visParams);
  }
}
