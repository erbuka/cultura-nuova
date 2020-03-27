import { Component, OnInit, Input } from '@angular/core';
import { Vector3 } from 'three';

@Component({
  selector: 'app-vector-input',
  templateUrl: './vector-input.component.html',
  styleUrls: ['./vector-input.component.scss']
})
export class VectorInputComponent implements OnInit {

  @Input() data: Vector3 = null;

  constructor() { }

  ngOnInit(): void {

  }


  updateData(coords: { x?: string, y?: string, z?: string }): void {
    for(let axis in coords) 
      this.data[axis] = parseFloat(coords[axis]) || 0;
      
  }

}
