import { readFile } from 'fs/promises';
import { join } from 'path';
import YAML from 'yaml';
import type { ProjectContext } from '@statuz/shared';
import { ProjectContextSchema } from '@statuz/shared';

export class ContextLoader {
  private contextPath: string;

  constructor(contextPath: string) {
    this.contextPath = contextPath;
  }

  async loadContext(): Promise<ProjectContext> {
    try {
      const [mission, targets, milestones, glossary] = await Promise.all([
        this.loadYamlFile('mission.yaml'),
        this.loadYamlFile('targets.yaml'),
        this.loadYamlFile('milestones.yaml'),
        this.loadYamlFile('glossary.yaml')
      ]);

      const context: ProjectContext = {
        mission: mission || { statement: '', goals: [] },
        targets: targets || { kpis: [] },
        milestones: milestones?.milestones || [],
        glossary: glossary || {}
      };

      // Validate the context against schema
      const validated = ProjectContextSchema.parse(context);
      return validated;
    } catch (error) {
      console.error('Failed to load project context:', error);
      // Return empty context as fallback
      return {
        mission: { statement: '', goals: [] },
        targets: { kpis: [] },
        milestones: [],
        glossary: {}
      };
    }
  }

  private async loadYamlFile(filename: string): Promise<any> {
    try {
      const filePath = join(this.contextPath, filename);
      const content = await readFile(filePath, 'utf-8');
      return YAML.parse(content);
    } catch (error) {
      console.warn(`Failed to load ${filename}:`, error);
      return null;
    }
  }

  async getContextChecksum(): Promise<string> {
    try {
      const files = ['mission.yaml', 'targets.yaml', 'milestones.yaml', 'glossary.yaml'];
      const contents = await Promise.all(
        files.map(async (file) => {
          try {
            const filePath = join(this.contextPath, file);
            return await readFile(filePath, 'utf-8');
          } catch {
            return '';
          }
        })
      );

      // Simple checksum - could use crypto.createHash for production
      return Buffer.from(contents.join('|')).toString('base64').slice(0, 16);
    } catch (error) {
      console.error('Failed to generate context checksum:', error);
      return '';
    }
  }
}