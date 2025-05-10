import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegionDeliveryComponent } from './region-delivery.component';

describe('RegionDeliveryComponent', () => {
  let component: RegionDeliveryComponent;
  let fixture: ComponentFixture<RegionDeliveryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegionDeliveryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegionDeliveryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
