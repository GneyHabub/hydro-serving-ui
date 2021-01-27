import { Component, OnInit } from '@angular/core';
import {
  Application,
  Servable,
  IModelVariant,
  ApplicationStatus,
} from '@app/core/data/types';
import { ApplicationsFacade } from '@app/core/facades/applications.facade';
import { ServablesFacade } from '@app/core/facades/servables.facade';
import {
  DialogUpdateModelVersionComponent,
  SELECTED_MODEL_VARIANT,
  LATEST_MODEL_VERSION,
  DialogTestComponent,
  SELECTED_APPLICATION,
  DialogUpdateApplicationComponent,
  SELECTED_UPD_APPLICATION,
  DialogDeleteApplicationComponent,
  SELECTED_DEL_APPLICATION,
} from '@app/modules/dialogs/components';
import { DialogsService } from '@app/modules/dialogs/dialogs.service';

import { Observable, BehaviorSubject } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

interface MenuState {
  showed: boolean;
  context?: IModelVariant | null;
  top: number;
  left: number;
}
const initialMenuState: MenuState = {
  showed: false,
  context: null,
  top: 0,
  left: 0,
};

@Component({
  selector: 'hs-application-details',
  templateUrl: './application-details.component.html',
  styleUrls: ['./application-details.component.scss'],
})
export class ApplicationDetailsComponent implements OnInit {
  application$: Observable<Application>;
  servables$: Observable<Servable[]>;
  servableNames$: Observable<string[]>;

  menu$: Observable<MenuState>;
  private menu: BehaviorSubject<MenuState> = new BehaviorSubject(
    initialMenuState
  );

  constructor(
    private readonly dialog: DialogsService,
    private readonly facade: ApplicationsFacade,
    private readonly servableFacade: ServablesFacade
  ) {
    this.menu$ = this.menu.asObservable();
  }

  ngOnInit() {
    this.application$ = this.facade.selectedApplication();
    this.servables$ = this.servableFacade.allServables();
    this.servableNames$ = this.application$.pipe(
      switchMap(app => {
        let modelVersion = app.executionGraph.stages[0]?.modelVariants[0]?.modelVersion;
        return this.servables$.pipe(
          map(servs => {
            return servs.filter(servable => servable.modelVersion.id === modelVersion.id).map(servable => servable.fullName);
          })
        );
      })
    )
  }

  public updateModelVersionDialog(lastModelVersion, modelVariant) {
    this.dialog.createDialog({
      component: DialogUpdateModelVersionComponent,
      providers: [
        { provide: SELECTED_MODEL_VARIANT, useValue: modelVariant },
        { provide: LATEST_MODEL_VERSION, useValue: lastModelVersion },
      ],
    });
  }

  public testApplication(application): void {
    this.dialog.createDialog({
      component: DialogTestComponent,
      providers: [{ provide: SELECTED_APPLICATION, useValue: application }],
    });
  }

  public editApplication(application): void {
    this.dialog.createDialog({
      component: DialogUpdateApplicationComponent,
      providers: [{ provide: SELECTED_UPD_APPLICATION, useValue: application }],
      styles: {
        height: '100%',
      },
    });
  }

  public removeApplication(application: Application) {
    this.dialog.createDialog({
      component: DialogDeleteApplicationComponent,
      providers: [{ provide: SELECTED_DEL_APPLICATION, useValue: application }],
    });
  }

  public isReady(status: string): boolean {
    return status === ApplicationStatus.Ready;
  }

  public isFailed(status: string): boolean {
    return status === ApplicationStatus.Failed;
  }

  public onClickModelVariant(
    evt: MouseEvent,
    modelVariant: IModelVariant
  ): void {
    this.menu.next({
      showed: true,
      context: modelVariant,
      left: evt.clientX - 12,
      top: evt.clientY - 12,
    });
  }

  public onMouseLeave(): void {
    this.menu.next({
      showed: false,
      context: this.menu.getValue().context,
      top: this.menu.getValue().top,
      left: this.menu.getValue().left,
    });
  }
}
