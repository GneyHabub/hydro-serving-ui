import { Component, InjectionToken, Inject } from '@angular/core';
import { DialogService } from '@dialog/dialog.service';
import { Store } from '@ngrx/store';
import { deleteServable } from '@servables/actions';
import { State } from '@servables/state';

export const SERVABLE_NAME_TOKEN = new InjectionToken('servable full name');

@Component({
  templateUrl: './dialog-delete-servable.component.html',
  styleUrls: ['./dialog-delete-servable.component.scss'],
})
export class DialogDeleteServableComponent {
  constructor(
    private dialogService: DialogService,
    @Inject(SERVABLE_NAME_TOKEN) private servableName: string,
    private store: Store<State>
  ) {}

  onDelete() {
    this.store.dispatch(deleteServable({ name: this.servableName }));
    this.onClose();
  }
  onClose() {
    this.dialogService.closeDialog();
  }
}
