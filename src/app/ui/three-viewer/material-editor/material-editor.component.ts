import { Component, OnInit, Inject } from '@angular/core';
import { ThreeViewerComponentModel, loadTexture } from '../three-viewer';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MeshStandardMaterial, Texture } from 'three';
import { ContextService } from 'src/app/context.service';

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

  constructor(public dialogRef: MatDialogRef<MaterialEditorComponent>, private context: ContextService, @Inject(MAT_DIALOG_DATA) public data: MaterialEditorData) { }

  ngOnInit(): void {
    this.selectedMaterial = this.data.model.materials[0];
  }

  newMaterial(): void {
    this.data.model.addMaterial("Default", "", this.data.model.meshes.map(x => new MeshStandardMaterial()));
  }


  async selectMap(material: MeshStandardMaterial): Promise<void> {
    let file = await this.context.fileChooser({ type: "arraybuffer", accept: ".png,.jpg,.jpeg" });
    let url = URL.createObjectURL(new Blob([file]));
    let texture = await loadTexture(url);
    
    material.map = texture;
    texture.premultiplyAlpha = false;
    texture.needsUpdate = true;
    material.needsUpdate = true;

  }

}
