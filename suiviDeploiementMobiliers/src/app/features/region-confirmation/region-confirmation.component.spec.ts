import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegionConfirmationComponent } from './region-confirmation.component';

describe('RegionConfirmationComponent', () => {
  let component: RegionConfirmationComponent;
  let fixture: ComponentFixture<RegionConfirmationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegionConfirmationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegionConfirmationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
