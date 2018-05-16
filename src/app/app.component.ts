import { Component, ViewContainerRef, OnInit } from '@angular/core';
import { MdlDialogOutletService } from '@angular-mdl/core';
import { Store } from '@ngrx/store';
import { HydroServingState } from '@core/reducers';
import * as Actions from '@shared/actions/_index';
import { GetApplicationsAction } from '@applications/actions/applications.actions';



@Component({
    selector: 'hydro-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

    constructor(
        private dialogOutletService: MdlDialogOutletService,
        private viewConatinerRef: ViewContainerRef,
        private store: Store<HydroServingState>,
    ) {
        this.dialogOutletService.setDefaultViewContainerRef(this.viewConatinerRef);
    }

    ngOnInit() {
        this.store.dispatch(new Actions.GetModelsAction);
        this.store.dispatch(new GetApplicationsAction);
        this.store.dispatch({ type: Actions.GET_RUNTIMES });
        this.store.dispatch({ type: Actions.GET_ENVIRONMENTS });
        this.store.dispatch(new Actions.GetModelVersionsAction);
    }
}
