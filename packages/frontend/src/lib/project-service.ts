import type { Project } from '@maquetto/api-types';
import { supabase, supabaseConfigured } from './supabase';

interface ProjectRow {
  id: string;
  user_id: string;
  title: string;
  code: string;
  created_at: string;
  updated_at: string;
}

function rowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    code: row.code,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listProjects(userId: string): Promise<Project[]> {
  if (!supabaseConfigured) return [];
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) {
    console.error('[ProjectService] listProjects error:', error);
    throw error;
  }
  return (data as ProjectRow[]).map(rowToProject);
}

export async function saveProject(
  project: Pick<Project, 'userId' | 'title' | 'code'> & { id?: string },
): Promise<Project> {
  if (!supabaseConfigured) {
    throw new Error('Supabase not configured');
  }

  if (project.id) {
    // Update existing
    const { data, error } = await supabase
      .from('projects')
      .update({
        title: project.title,
        code: project.code,
        updated_at: new Date().toISOString(),
      })
      .eq('id', project.id)
      .select()
      .single();
    if (error) {
      console.error('[ProjectService] update error:', error);
      throw error;
    }
    return rowToProject(data as ProjectRow);
  }

  // Insert new
  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: project.userId,
      title: project.title,
      code: project.code,
    })
    .select()
    .single();
  if (error) {
    console.error('[ProjectService] insert error:', error);
    throw error;
  }
  return rowToProject(data as ProjectRow);
}

export async function deleteProject(id: string): Promise<void> {
  if (!supabaseConfigured) return;
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) {
    console.error('[ProjectService] delete error:', error);
    throw error;
  }
}
