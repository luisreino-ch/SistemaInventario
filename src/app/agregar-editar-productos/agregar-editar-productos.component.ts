import { Component, Inject, OnInit, importProvidersFrom } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Productos } from '../interfaces/productos';
import { ChangeDetectorRef } from '@angular/core';

import { MatSnackBar } from '@angular/material/snack-bar';
import { ProductoService } from '../service/productos.service';
import { CategoriaService } from '../service/categoria.service';

@Component({
  selector: 'app-agregar-editar-productos',
  templateUrl: './agregar-editar-productos.component.html',
  styleUrls: ['./agregar-editar-productos.component.css'],
})
export class AgregarEditarProductosComponent implements OnInit {

  form: FormGroup;
  operacion: string = 'Agregar ';
  id: number | undefined;
  categorias: any[] = [];

  constructor(public dialogRef: MatDialogRef<AgregarEditarProductosComponent>,
    private fb: FormBuilder, private _productoService: ProductoService,
    private cdr: ChangeDetectorRef,  private _categoriaService: CategoriaService, private _snackBar: MatSnackBar, @Inject(MAT_DIALOG_DATA) public data: any) {
      this.form = this.fb.group({
        CategoriaID: ['', [Validators.required]],
        Nombre: ['', [Validators.required, Validators.maxLength(50),Validators.minLength(3), Validators.pattern('^[a-zA-Z0-9 ]*$')]],
        Precio: ['', [Validators.required, Validators.pattern('^[0-9]+(\.[0-9]{1,2})?$')]],
        Stock: ['', [Validators.required, Validators.pattern('^[0-9]+$')]]
      })
      this.id = data?.id;
      this.categorias = data?.categorias || [];
    }

  ngOnInit(): void {
    this.esEditar(this.id);
    if (this.categorias.length === 0) {
      this.loadCategorias();
    }
  }

  esEditar(id: number | undefined) {
    if(id !== undefined) {
      this.operacion = 'Editar';
      this.getProducto(id);
    }
  }

  getProducto(id: number) {
    this._productoService.getProducto(id).subscribe(data => {
      this.form.setValue({
        CategoriaID: data.CategoriaID,
        Nombre: data.Nombre,
        Precio: data.Precio,
        Stock: data.Stock
      });

      // Si las categorías aún no se han cargado, cárgalas
      if (this.categorias.length === 0) {
        this.loadCategorias();
      } else {
        // Si las categorías ya se han cargado, establece el valor del campo 'CategoriaID'
        this.form.get('CategoriaID')?.setValue(data.CategoriaID);
      }
    });
  }
  loadCategorias() {
    this._categoriaService.getCategorias().subscribe((data) => {
      this.categorias = data;
      console.log(this.categorias);

      // Si se está editando un producto, establece el valor del campo 'CategoriaID' al 'CategoriaID' del producto
      if (this.id !== undefined) {
        this.form.get('CategoriaID')?.setValue(this.form.value.CategoriaID);
      } else {
        // Si se está agregando un producto, establece el valor del campo 'CategoriaID' a la primera categoría
        this.form.get('CategoriaID')?.setValue(this.categorias.length > 0 ? this.categorias[0].id : '');
      }

      this.cdr.detectChanges();
    });
  }

  cancelar() {
    this.dialogRef.close(false);
  }

  addEditProducto() {
    if (this.form.invalid) {
      return;
    }

    const producto: Productos = {
      ProductoID: this.id || 0,
      CategoriaID: this.form.value.CategoriaID,
      Nombre: this.form.value.Nombre,
      Precio: this.form.value.Precio,
      Stock: this.form.value.Stock
    }

    if (this.id == undefined) {
      // Es agregar
      this._productoService.addProducto(producto).subscribe(() => {
        this.mensajeExito("agregado");
      });
    } else {
      // Es editar
      this._productoService.updateProducto(this.id, producto).subscribe(() => {
        this.mensajeExito("actualizado");
      })
    }
    this.dialogRef.close(true);
  }

  mensajeExito(operacion: string) {
    this._snackBar.open(`El producto fue ${operacion} con éxito`, '', {
      duration: 2000,
    });
  }
}
