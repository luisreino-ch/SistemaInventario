import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Movimientos } from '../interfaces/movimientos';
import { MovimientosService } from '../service/movimientos.service';
import { ProductoService } from '../service/productos.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ChangeDetectorRef } from '@angular/core';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { tap } from 'rxjs/operators';

import * as moment from 'moment';
import { first } from 'rxjs/operators';




@Component({
  selector: 'app-agregar-editar-movimientos',
  templateUrl: './agregar-editar-movimientos.component.html',
  styleUrls: ['./agregar-editar-movimientos.component.css'],
})
export class AgregarEditarMovimientosComponent implements OnInit {

  form:FormGroup;
  operacion: string = 'Agregar ';
  id: number | undefined;
  productos: any[] = [];


  constructor(public dialogRef: MatDialogRef<AgregarEditarMovimientosComponent>,private cdr: ChangeDetectorRef,
    private fb:FormBuilder, private _movimientosService: MovimientosService, private _productoService: ProductoService, private _snackBar: MatSnackBar, @Inject(MAT_DIALOG_DATA) public data: any,  @Inject(MAT_DATE_LOCALE) private _locale: string){
      this.form = this.fb.group({
        ProductoID: ['', Validators.required],
        Cantidad: ['', [Validators.required, Validators.pattern('^[0-9]*$'), Validators.min(1)]],
        FechaMovimiento: ['', Validators.required],
        TipoMovimiento: ['', Validators.required]
      })
      this.id = data?.id;
      this.productos = data?.productos || [];
    }




    ngOnInit(): void {
      this.loadProductos().subscribe(() => {
        if (this.data.id !== undefined) {
          this.esEditar(this.data.id);
        }
      });
    }


    esEditar(id: number) {
      this.operacion = 'Editar';
      this._movimientosService.getMovimiento(id).pipe(first()).subscribe(data => {
        console.log(data); // Add this line for debugging
        let formattedDate = moment(data.FechaMovimiento).format('YYYY-MM-DD');
        this.form.patchValue({
          ProductoID: data.ProductoID,
          Cantidad: data.Cantidad,
          FechaMovimiento: formattedDate,
          TipoMovimiento: data.TipoMovimiento || '',
        });
      });
    }

    getMovimiento(id: number) {
      this._movimientosService.getMovimiento(id).subscribe(
        (data) => {
          console.log(data); // Add this line for debugging
          data.FechaMovimiento = new Date(data.FechaMovimiento);
          this.form.patchValue({
            ProductoID: data.ProductoID,
            Cantidad: data.Cantidad,
            FechaMovimiento: data.FechaMovimiento,
            TipoMovimiento: data.TipoMovimiento || '',
          });
        },
        (error) => {
          console.error('Error al obtener el movimiento:', error);
        }
      );
    }


  loadProductos() {
    return this._productoService.getProductos().pipe(
      tap((data) => {
        this.productos = data;
        console.log(this.productos);

        // Set the default value for ProductoID after loading products
        this.form.get('ProductoID')?.setValue(
          this.productos.length > 0 ? this.productos[0].id : ''
        );
        this.cdr.detectChanges();

        // If in edit mode, get the movement after loading products
        if (this.id !== undefined) {
          this.getMovimiento(this.id);
        }
      })
    );
  }


  cancelar() {
    this.dialogRef.close(false);
  }

  getDateFormatString(): string {
    if (this._locale === 'ja-JP') {
      return 'YYYY/MM/DD';
    } else if (this._locale === 'fr') {
      return 'DD/MM/YYYY';
    }
    return '';
  }

  dateFilter = (date: Date | null): boolean => {
    const today = new Date();
    if (!date) {
      return false;
    }
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  }

  addEditMovimiento() {
    if (this.form.invalid) {
      return;
    }

    const movimientos: Movimientos = {
      ProductoID: this.form.value.ProductoID,
      Cantidad: this.form.value.Cantidad,
      FechaMovimiento: this.form.value.FechaMovimiento,
      TipoMovimiento: this.form.value.TipoMovimiento
    };

    if (this.id == undefined) {
      // Es agregar
      this._movimientosService.addMovimiento(movimientos).subscribe(() => {
        this.mensajeExito("agregado");
        this.actualizarStockDespuesMovimiento(movimientos);
      });
    } else {
      // Es editar
      this._movimientosService.updateMovimiento(this.id, movimientos).subscribe(() => {
        this.mensajeExito("actualizado");
        this.actualizarStockDespuesMovimiento(movimientos);
      });
    }

    this.dialogRef.close(true);
  }


  actualizarStockDespuesMovimiento(movimiento: Movimientos) {
      if (movimiento.TipoMovimiento === 'Entrada') {
        // Sumar la cantidad al stock utilizando el servicio de productos
        this._productoService.getProducto(movimiento.ProductoID).subscribe(producto => {
          producto.Stock = Number(producto.Stock) + Number(movimiento.Cantidad);
          this._productoService.updateProducto(producto.ProductoID, producto).subscribe(() => {
            console.log('Stock actualizado después de entrada:', producto.Stock);
          });
        });
      } else if (movimiento.TipoMovimiento === 'Salida') {
        // Restar la cantidad al stock utilizando el servicio de productos
        this._productoService.getProducto(movimiento.ProductoID).subscribe(producto => {
          if (Number(producto.Stock) >= Number(movimiento.Cantidad)) {
            producto.Stock = Number(producto.Stock) - Number(movimiento.Cantidad);
            this._productoService.updateProducto(producto.ProductoID, producto).subscribe(() => {
              console.log('Stock actualizado después de salida:', producto.Stock);
            });
          } else {
            console.error('Stock insuficiente para la salida.');
          }
        });
      }
    }




  mensajeExito(operacion:string) {
    this._snackBar.open(`El movimiento fue ${operacion} con exito`, '', {
      duration: 2000,
    });
  }
}
