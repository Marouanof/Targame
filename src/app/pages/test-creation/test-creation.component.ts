import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormControl } from '@angular/forms';
import { Database, ref, set, onValue, get } from '@angular/fire/database';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import {
  FindCompositionsConfig,
  VerticalOperationsConfig,
  MultiStepProblemConfig
} from '../../types/mini-game-types';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-test-creation',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './test-creation.component.html',
  styleUrl: './test-creation.component.css'
})
export class TestCreationComponent {
  private fb = inject(FormBuilder);
  private db = inject(Database);
  private auth = inject(AuthService);
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  gradeLevels: string[] = [];
  teacherUID: string = '';
  selectedMiniGames: string[] = [];
  allMiniGames: {
    id: string;
    title: string;
    configTemplate: Partial<
      FindCompositionsConfig &
      VerticalOperationsConfig &
      MultiStepProblemConfig 
    >;
  }[] = [];
  testId: string | null = null;
  isEditMode = false;

  testForm: FormGroup = this.fb.group({
    title: ['', Validators.required],
    classroomId: ['', Validators.required],
    testDuration: [30, [Validators.required, Validators.min(5)]],
    selectedMiniGames: [[]],
    miniGameConfigs: this.fb.group({})
  });

  ngOnInit() {
    this.testId = this.route.snapshot.paramMap.get('testId');
    this.isEditMode = !!this.testId;

    // Écouter les changements de classroomId pour mettre à jour les mini-jeux
    this.testForm.get('classroomId')?.valueChanges.subscribe(grade => {
      this.loadMiniGames(grade);
    });

    this.auth.getCurrentUserWithRole().subscribe(user => {
      if (!user) return;
      this.teacherUID = user.uid;
      const usersRef = ref(this.db, 'users');

      onValue(usersRef, (snapshot) => {
        const allUsers = snapshot.val();
        const gradesSet = new Set<string>();

        for (const key in allUsers) {
          const student = allUsers[key];
          if (student.role === 'Student' && student.linkedTeacherId === this.teacherUID && student.schoolGrade) {
            gradesSet.add(`${student.schoolGrade}`);
          }
        }

        this.gradeLevels = Array.from(gradesSet).sort();
      });

      // Charger les données du test si en mode édition
      if (this.isEditMode && this.testId) {
        const testRef = ref(this.db, `tests/${this.testId}`);
        get(testRef).then(snapshot => {
          if (snapshot.exists()) {
            const testData = snapshot.val();
            this.testForm.patchValue({
              title: testData.testName,
              classroomId: testData.grade,
              testDuration: testData.testDuration,
              selectedMiniGames: testData.miniGameOrder || []
            });
            this.selectedMiniGames = testData.miniGameOrder || [];

            // Remplir les configurations des mini-jeux
            const configs = this.testForm.get('miniGameConfigs') as FormGroup;
            Object.keys(testData.miniGameConfigs || {}).forEach(gameId => {
              configs.addControl(gameId, this.fb.group(testData.miniGameConfigs[gameId]));
            });

            // Charger les mini-jeux pour le niveau scolaire du test
            this.loadMiniGames(testData.grade);
          }
        });
      } else {
        // Charger les mini-jeux pour le niveau scolaire par défaut (premier niveau disponible ou '4')
        const defaultGrade = this.gradeLevels.length > 0 ? this.gradeLevels[0] : '4';
        this.testForm.get('classroomId')?.setValue(defaultGrade);
      }
    });
  }

  loadMiniGames(selectedGrade: string) {
    this.http.get('/mini-games.json').subscribe((data: any) => {
      const gameDefs = data.miniGames;
      this.allMiniGames = Object.entries(gameDefs).map(([id, game]: any) => {
        const gradeConfigs = game.defaultConfig?.gradeConfig || {};
        const fallbackConfig = Object.values(gradeConfigs)[0] || {};
        return {
          id,
          title: game.title?.en || id,
          configTemplate: gradeConfigs[selectedGrade] || fallbackConfig
        };
      });

      // Mettre à jour les configurations des mini-jeux sélectionnés
      const configs = this.testForm.get('miniGameConfigs') as FormGroup;
      this.selectedMiniGames.forEach(gameId => {
        configs.removeControl(gameId); // Supprimer l'ancienne configuration
        configs.addControl(gameId, this.fb.group(this.buildMiniGameControls(gameId))); // Ajouter la nouvelle
      });

      // Mettre à jour le formulaire
      this.testForm.get('selectedMiniGames')?.setValue(this.selectedMiniGames);
    });
  }

  onMiniGameToggle(gameId: string, checked: boolean) {
    const configs = this.testForm.get('miniGameConfigs') as FormGroup;
    if (checked) {
      this.selectedMiniGames.push(gameId);
      configs.addControl(gameId, this.fb.group(this.buildMiniGameControls(gameId)));
    } else {
      this.selectedMiniGames = this.selectedMiniGames.filter(id => id !== gameId);
      configs.removeControl(gameId);
    }
    this.testForm.get('selectedMiniGames')?.setValue(this.selectedMiniGames);
  }

  buildMiniGameControls(gameId: string): { [key: string]: FormControl } {
    const game = this.allMiniGames.find(g => g.id === gameId);
    const fields = game?.configTemplate || {};
    const controls: { [key: string]: FormControl } = {};

    for (const key in fields) {
      controls[key] = new FormControl(fields[key as keyof typeof fields], Validators.required);
    }

    return controls;
  }

  onCheckboxChange(event: Event, gameId: string) {
    const input = event.target as HTMLInputElement;
    this.onMiniGameToggle(gameId, input.checked);
  }

  submitTest() {
    if (this.testForm.invalid) return;

    const testData = this.testForm.value;
    const testId = this.isEditMode ? this.testId : 'test_' + Date.now();
    const testObject = {
      testName: testData.title,
      teacherId: this.teacherUID,
      grade: testData.classroomId,
      testDuration: testData.testDuration,
      isDraft: false,
      miniGameOrder: testData.selectedMiniGames,
      miniGameConfigs: testData.miniGameConfigs,
      createdAt: this.isEditMode ? Date.now() : Date.now(),
    };

    set(ref(this.db, `tests/${testId}`), testObject)
      .then(() => {
        alert(this.isEditMode ? '✅ Test updated successfully!' : '✅ Test created successfully!');
        this.router.navigate(['/dashboard'], { queryParams: { section: 'test-list' } });
      })
      .catch((err) => console.error('❌ Error saving test:', err));
  }

  getKey(key: any): string {
    return key.key;
  }
}
