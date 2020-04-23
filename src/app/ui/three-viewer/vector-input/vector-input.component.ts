import { Component, OnInit, Input, EventEmitter, Output } from '@angular/core';
import { Vector3 } from 'three';

@Component({
  selector: 'app-vector-input',
  templateUrl: './vector-input.component.html',
  styleUrls: ['./vector-input.component.scss']
})
export class VectorInputComponent implements OnInit {

  @Input() data: Vector3 = null;
  @Output() dataChange: EventEmitter<Vector3> = new EventEmitter();

  constructor() { }

  ngOnInit(): void {

  }

  updateData(coords: { x?: string, y?: string, z?: string }): void {
    for (let axis in coords)
      this.data[axis] = parseFloat(coords[axis]) || 0;
    this.dataChange.emit(this.data.clone());
  }

}
