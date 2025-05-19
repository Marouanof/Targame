import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { NgIf } from '@angular/common';
import { RoleManagementComponent } from '../role-management/role-management.component';
import { NavBarComponent } from '../../shared/nav-bar/nav-bar.component';
import { StudentRegistrationComponent } from '../student-registration/student-registration.component';
import { StudentListComponent } from '../student-list/student-list.component';
import { SidebarComponent } from '../../shared/sidebar/sidebar.component';
import { TestCreationComponent } from '../test-creation/test-creation.component';
import { TestListComponent } from '../test-list/test-list.component';
import { CreateParentComponent } from '../create-parent/create-parent.component';

@Component({
  selector: 'app-dashboard',
  imports: [NgIf, NavBarComponent, SidebarComponent, 
    RoleManagementComponent, StudentRegistrationComponent, 
    StudentListComponent, TestCreationComponent, 
    TestListComponent, CreateParentComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  userRole: string | null = null;
  loading = true;
  selectedSection = 'student-list'; // default view for teachers

  constructor(private auth: AuthService) {}

  ngOnInit() {
    this.auth.getCurrentUserWithRole().subscribe(user => {
      if (user) this.userRole = user.role;
      this.loading = false;
      if (this.userRole === "Teacher") {
        this.selectedSection = 'student-list';
      }
      else if (this.userRole === "Admistrator" || this.userRole === "Principal")
      {
        this.selectedSection = 'user-list';
      }
    });
  }

  onSectionSelected(section: string) {
    this.selectedSection = section;
  }
    
}