import { Component, OnInit, Inject } from '@angular/core';
import { ThreeViewerComponentModel } from '../three-viewer';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MeshStandardMaterial } from 'three';

export type MaterialEditorData = {
  model: ThreeViewerComponentModel
}

@Component({
  selector: 'app-material-editor',
  templateUrl: './material-editor.component.html',
  styleUrls: ['./material-editor.component.scss']
})
export class MaterialEditorComponent implements OnInit {

  selectedMaterial: ThreeViewerComponentModel.Material = null;

  constructor(public dialogRef: MatDialogRef<MaterialEditorComponent>, @Inject(MAT_DIALOG_DATA) public data: MaterialEditorData) { }

  ngOnInit(): void {
    this.selectedMaterial = this.data.model.materials[0];
  }

  newMaterial():void {
    this.data.model.addMaterial("Default", "", this.data.model.meshes.map(x=>new MeshStandardMaterial()));
  }

}
