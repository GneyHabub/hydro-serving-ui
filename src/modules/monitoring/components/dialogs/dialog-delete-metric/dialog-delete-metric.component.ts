import { Component, InjectionToken, Output, EventEmitter, Input } from '@angular/core';

import { DialogService } from '@dialog/dialog.service';
import { MetricsFacade } from '@monitoring/store/facades/metrics.facade';

export const METRIC_ID_VALUE = new InjectionToken<string>('metric id value');

@Component({
  templateUrl: 'dialog-delete-metric.component.html',
  styleUrls: ['dialog-delete-metric.component.scss'],
})
export class DialogDeleteMetricComponent {
  @Output() closed: EventEmitter<any> = new EventEmitter();
  @Input() metricId: string;
  constructor(public dialog: DialogService, private facade: MetricsFacade) {}

  public onClose(): void {
    this.closed.next();
  }

  public onDelete() {
    this.facade.deleteMetric(this.metricId);
    this.closed.next();
  }
}
