import { Component, OnInit, InjectionToken, Inject } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MdlDialogReference, MdlSnackbarService } from '@angular-mdl/core';

import { Store } from '@ngrx/store';
import * as Actions from '@shared/actions/_index';
import { AppState, ModelService, Service } from '@shared/models/_index';
import { FormsService, ModelServicesService, ServicesService } from '@shared/services/_index';



@Component({
  selector: 'hydro-dialog-add-service',
  templateUrl: './dialog-add-service.component.html',
  styleUrls: ['./dialog-add-service.component.scss'],
  providers: [FormsService]
})
export class DialogAddServiceComponent implements OnInit {
    public isKafkaEnabled: boolean = false;
    public serviceIdLabel: string = 'Models Name';
    public serviceForm: FormGroup;
    public selectedService: Service;
    public formTitle: string;
    public formErrors = {
        serviceName: '',
        weights: '',
        serviceId: '',
        modelVersion: '',
        weight: '',
    };
    public modelServices: ModelService[];

    public modelVersions: string[] = [];

    public services: Service[];

    constructor(
        private fb: FormBuilder,
        public dialogRef: MdlDialogReference,
        private formsService: FormsService,
        private mdlSnackbarService: MdlSnackbarService,
        private store: Store<AppState>,
        private servicesService: ServicesService,
        private modelServicesService: ModelServicesService
    ) {
        this.store.select('services')
            .subscribe(services => {
                this.services = services;
            });
        this.store.select('modelService')
            .subscribe(modelService => {
                this.modelServices = modelService;
                console.log(this.modelServices);
            });
    }

    ngOnInit() {
        this.createServiceForm();
        this.initFormChangesListener();
    }

    private initFormChangesListener() {
        this.serviceForm.valueChanges.subscribe((form) => {
            let result = 0;
            // todo fix errors reset
            this.formErrors.weights = '';
            this.formErrors.serviceId = '';
            form.weights.forEach((service) => {
                result += +service.weight;
            });

            if (result > 100) {
                this.serviceForm.controls.weights.setErrors({ overflow: true });
            }

            if (this.serviceForm.invalid) {
                this.formsService.setErrors(this.serviceForm, this.formErrors, this.formsService.MESSAGES.ERRORS.forms.service);
            }
        });
    }

    private createServiceForm() {
        this.serviceForm = this.fb.group({
            serviceName: ['', Validators.required],
            weights: this.fb.array([this.createWeightsForm()])
        });
    }

    private createWeightsForm() {
        return this.fb.group({
            serviceId: ['', [Validators.required, Validators.pattern(this.formsService.VALIDATION_PATTERNS.number)]],
            weight: ['', [Validators.required, Validators.pattern(this.formsService.VALIDATION_PATTERNS.number)]]
        });
    }

    addWeightsForm() {
        const control = <FormArray>this.serviceForm.controls['weights'];
        control.push(this.createWeightsForm());
    }

    removeWeightsForm(i: number) {
        const control = <FormArray>this.serviceForm.controls['weights'];
        control.removeAt(i);
    }

    setModelService(value) {
        console.log(value);
    }

    submitServiceForm(form) {
        if (this.serviceForm.invalid) {
            return;
        }

        const formWeights = form.controls.weights;
        const weights: object[] = [];
        let service: Service;

        for ( let i = 0; i < formWeights.length; i++ ) {
            weights.push({
                serviceId: Number(formWeights.controls[i].controls.serviceId.value),
                weight: Number(formWeights.controls[i].controls.weight.value)
            });
        }

        service = {
            id: this.services.length ? this.services[this.services.length - 1].id + 1 : 1,
            serviceName: form.controls.serviceName.value,
            weights: weights
        };

        this.servicesService.addService(service)
            .subscribe(services => {
                console.log(services);
                this.store.dispatch({ type: Actions.ADD_SERVICE, payload: service });
                this.dialogRef.hide();
                this.mdlSnackbarService.showSnackbar({
                    message: 'Service was successfully added',
                    timeout: 5000
                });
                console.log(services);
            });
    }

}
