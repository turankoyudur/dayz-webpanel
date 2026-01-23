export type FsRoot = {
  id: string;
  label: string;
  path: string;
};

export type FsEntry = {
  name: string;
  isDir: boolean;
  size: number;
  mtimeMs: number;
};

export type FsRootsResponse = {
  roots: FsRoot[];
};

export type FsListResponse = {
  root: FsRoot;
  relPath: string;
  parentRelPath: string;
  entries: FsEntry[];
};