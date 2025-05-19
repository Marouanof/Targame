import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Database } from '@angular/fire/database';
import { onValue, ref } from 'firebase/database';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-test-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './test-list.component.html',
  styleUrl: './test-list.component.css'
})
export class TestListComponent implements OnInit {
  private db = inject(Database);
  private auth = inject(AuthService);
  private router = inject(Router);

  teacherUID = '';
  allTests: any[] = [];
  filteredTests: any[] = [];
  grades: string[] = [];
  selectedGrade = '';

  ngOnInit() {
    this.auth.getCurrentUserWithRole().subscribe(user => {
      if (!user) return;
      this.teacherUID = user.uid;

      const testsRef = ref(this.db, 'tests');
      onValue(testsRef, (snapshot) => {
        const all = snapshot.val() || {};
        this.allTests = Object.entries(all).map(([testId, test]: [string, any]) => ({
          testId,
          ...test
        })).filter((test: any) => test.teacherId === this.teacherUID);
        this.grades = [...new Set(this.allTests.map((t: any) => t.grade))];
        this.applyFilter();
      });
    });
  }

  applyFilter() {
    this.filteredTests = this.selectedGrade
      ? this.allTests.filter(t => t.grade === this.selectedGrade)
      : this.allTests;
  }

  editTest(testId: string) {
    this.router.navigate(['/edit-test', testId]);
  }
}