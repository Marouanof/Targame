import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-nav-bar',
  standalone: true,
  imports: [CommonModule,RouterModule],
  templateUrl: './nav-bar.component.html',
  styleUrl: './nav-bar.component.css'
})
export class NavBarComponent {
  menuOpen = false;
  isLoggedIn = false;

  constructor(private auth: AuthService) {}

  ngOnInit() {
  this.auth.getCurrentUserWithRole().subscribe(user => {
    this.isLoggedIn = !!user;
  });
}


  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  logout() {
    this.auth.logout().then(() => window.location.reload());
  }
}