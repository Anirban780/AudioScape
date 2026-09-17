import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { PlaylistsService } from './playlists.service';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { UpdatePlaylistDto } from './dto/update-playlist.dto';
import { AddPlaylistTrackDto } from './dto/add-playlist-track.dto';
import { ReorderTracksDto } from './dto/reorder-tracks.dto';
import { GoogleAuthGuard } from '../auth/google-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

/**
 * ============================================================================
 * HTTP CONTROLLER: PLAYLISTS & TRACK MANAGEMENT ROUTING LAYER
 * ============================================================================
 * @module PlaylistsModule
 * @route `/api/playlists`
 * 
 * PURPOSE:
 * Exposes REST endpoints for client applications to manage custom playlists,
 * add/remove tracks, and reorder track positions within playlists.
 *
 * WHY THIS IS NEEDED FOR PRODUCTION:
 * - Protected Access Control: Applies `GoogleAuthGuard` across all endpoints to ensure user privacy.
 * - Input Validation: Integrates DTO validation pipes on body payloads.
 * - Strict REST Standard: Clean HTTP verb mapping (`GET`, `POST`, `PUT`, `DELETE`).
 * ============================================================================
 */
@Controller('api/playlists')
@UseGuards(GoogleAuthGuard)
export class PlaylistsController {
  constructor(private readonly playlistsService: PlaylistsService) {}

  /**
   * Create a new custom playlist.
   * @route POST `/api/playlists`
   * @header Authorization Bearer <google_id_token>
   */
  @Post()
  async createPlaylist(@GetUser('id') userId: string, @Body() dto: CreatePlaylistDto) {
    return this.playlistsService.createPlaylist(userId, dto);
  }

  /**
   * Retrieve all playlists owned by authenticated user.
   * @route GET `/api/playlists`
   * @header Authorization Bearer <google_id_token>
   */
  @Get()
  async getUserPlaylists(@GetUser('id') userId: string) {
    return this.playlistsService.getUserPlaylists(userId);
  }

  /**
   * Retrieve list of playlist IDs containing a given track for authenticated user.
   * @route GET `/api/playlists/membership/:videoId`
   * @header Authorization Bearer <google_id_token>
   */
  @Get('membership/:videoId')
  async getTrackMembership(
    @GetUser('id') userId: string,
    @Param('videoId') videoId: string,
  ) {
    return this.playlistsService.getTrackMembership(userId, videoId);
  }

  /**
   * Retrieve single playlist details by ID with ordered tracks.
   * @route GET `/api/playlists/:id`
   * @header Authorization Bearer <google_id_token>
   */
  @Get(':id')
  async getPlaylistById(@GetUser('id') userId: string, @Param('id') playlistId: string) {
    return this.playlistsService.getPlaylistById(userId, playlistId);
  }

  /**
   * Rename an existing playlist.
   * @route PUT `/api/playlists/:id`
   * @header Authorization Bearer <google_id_token>
   */
  @Put(':id')
  async updatePlaylist(
    @GetUser('id') userId: string,
    @Param('id') playlistId: string,
    @Body() dto: UpdatePlaylistDto,
  ) {
    return this.playlistsService.updatePlaylist(userId, playlistId, dto);
  }

  /**
   * Delete a playlist by ID.
   * @route DELETE `/api/playlists/:id`
   * @header Authorization Bearer <google_id_token>
   */
  @Delete(':id')
  async deletePlaylist(@GetUser('id') userId: string, @Param('id') playlistId: string) {
    return this.playlistsService.deletePlaylist(userId, playlistId);
  }

  /**
   * Add a track to a playlist.
   * @route POST `/api/playlists/:id/tracks`
   * @header Authorization Bearer <google_id_token>
   */
  @Post(':id/tracks')
  async addTrack(
    @GetUser('id') userId: string,
    @Param('id') playlistId: string,
    @Body() dto: AddPlaylistTrackDto,
  ) {
    return this.playlistsService.addTrackToPlaylist(userId, playlistId, dto);
  }

  /**
   * Remove a track from a playlist and re-sequence remaining track positions.
   * @route DELETE `/api/playlists/:id/tracks/:trackId`
   * @header Authorization Bearer <google_id_token>
   */
  @Delete(':id/tracks/:trackId')
  async removeTrack(
    @GetUser('id') userId: string,
    @Param('id') playlistId: string,
    @Param('trackId') trackId: string,
  ) {
    return this.playlistsService.removeTrackFromPlaylist(userId, playlistId, trackId);
  }

  /**
   * Reorder track positions within a playlist.
   * @route PUT `/api/playlists/:id/tracks/reorder`
   * @header Authorization Bearer <google_id_token>
   */
  @Put(':id/tracks/reorder')
  async reorderTracks(
    @GetUser('id') userId: string,
    @Param('id') playlistId: string,
    @Body() dto: ReorderTracksDto,
  ) {
    return this.playlistsService.reorderPlaylistTracks(userId, playlistId, dto);
  }
}
