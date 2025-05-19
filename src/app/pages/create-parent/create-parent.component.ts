import { NgFor, NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { Database, ref, set, push, get } from '@angular/fire/database';
import {  FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { from } from 'rxjs';
import jsPDF from 'jspdf';
import { hashPassword } from '../../utils/password-utils';

@Component({
  selector: 'app-create-parent',
  standalone: true,
  imports: [NgFor, NgIf, ReactiveFormsModule, FormsModule],
  templateUrl: './create-parent.component.html',
  styleUrl: './create-parent.component.css'
})

export class CreateParentComponent {
  parentFirstName = '';
  parentLastName = '';
  parentUsername = '';
  parentPassword = '';
  students: any[] = [];
  linkedChildren: string[] = [];
  selectedChildId: string = '';

  constructor(private db: Database) {
    this.loadStudents();
    this.generateUsername();
    this.generatePassword();
  }

  loadStudents() {
    from(get(ref(this.db, 'users'))).subscribe({
      next: snapshot => {
        const allUsers = snapshot.val();
        if (allUsers) {
          this.students = Object.entries(allUsers)
            .map(([uid, data]: [string, any]) => ({ uid, ...data }))
            .filter(user => user.role === 'Student');
        }
      }
    });
  }

  generateUsername() {
    // ensuring both fields are filled
    if (!this.parentFirstName.trim() || !this.parentLastName.trim()) {
      this.parentUsername = '';
      return;
    }
  
    const name = `${this.parentFirstName.trim().toLowerCase()}_${this.parentLastName.trim().toLowerCase()}`;
    const randomNum = Math.floor(Math.random() * 10000);
  
    const generatedUsername = `${name}_${randomNum}`;
  
    // checking if the username already exists in the database
    from(get(ref(this.db, 'users'))).subscribe({
      next: snapshot => {
        const allUsers = snapshot.val();
        if (allUsers) {
          const usernames = Object.values(allUsers).map((user: any) => user.username);
          if (usernames.includes(generatedUsername)) {
            // if it does exist regenerate
            this.generateUsername();
          } else {
            // if it doesn't assign it
            this.parentUsername = generatedUsername;
          }
        } else {
          // no users assign the username directly
          this.parentUsername = generatedUsername;
        }
      },
      error: err => {
        console.error('Error checking username availability:', err);
        this.parentUsername = generatedUsername; // Default if error occurs
      }
    });
  }  

  generatePassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    this.parentPassword = Array.from({ length: 10 })
      .map(() => chars.charAt(Math.floor(Math.random() * chars.length)))
      .join('');
  }

  linkChild() {
    if (this.selectedChildId && !this.linkedChildren.includes(this.selectedChildId)) {
      this.linkedChildren.push(this.selectedChildId);
    }
  }

  removeChild(childId: string) {
    this.linkedChildren = this.linkedChildren.filter(id => id !== childId);
  }


  getChildName(childId: string): string {
    const student = this.students.find(s => s.uid === childId);
    return student ? `${student.firstName} ${student.lastName}` : 'Unknown';
  }

  createParentAccount() {
    if (this.linkedChildren.length === 0) {
      alert("A parent must have at least one linked child.");
      return;
    }
    
    const newParentRef = push(ref(this.db, 'users'));
    const parentUid = newParentRef.key;

    const hashedPassword = hashPassword(this.parentPassword);

    set(newParentRef, {
      uid: parentUid,
      username: this.parentUsername,
      password: hashedPassword,
      mustChangePassword: true,
      role: 'Parent',
      firstName: this.parentFirstName,
      lastName: this.parentLastName,
      linkedChildrenIds: this.linkedChildren
    });

    alert(`Parent Account Created\nUsername: ${this.parentUsername}\nPassword: ${this.parentPassword}`);
    this.generatePDF(this.parentFirstName, this.parentLastName, this.parentUsername, this.parentPassword);
    this.resetForm();
  }

  resetForm() {
    this.parentFirstName = '';
    this.parentLastName = '';
    this.generatePassword();
    this.linkedChildren = [];
  }

  generatePDF(firstName: string, lastName: string, username: string, password: string) {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Dear ${firstName} ${lastName}, the following are your account credentials:`, 20, 20);
    doc.setFontSize(12);
    doc.text(`Username: ${username}`, 20, 40);
    doc.text(`Password: ${password}`, 20, 50);
    doc.text(`Please keep this information secure.`, 20, 70);
  
    doc.save(`Parent_Credentials_${username}.pdf`);
  }
}