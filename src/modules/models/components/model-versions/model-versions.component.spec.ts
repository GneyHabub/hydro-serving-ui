import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { SharedModule } from '@shared/shared.module';
import { ModelVersionStatusComponent } from '../model-version-status/model-version-status.component';
import { ModelVersionsComponent } from './model-versions.component';

describe('ModelVersionsComponent', () => {
  let component: ModelVersionsComponent;
  let fixture: ComponentFixture<ModelVersionsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [SharedModule],
      declarations: [ModelVersionsComponent, ModelVersionStatusComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ModelVersionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
