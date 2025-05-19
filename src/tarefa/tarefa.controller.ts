import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Put,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { CriarTarefaDto, TarefaService } from './tarefa.service';

@Controller('tarefas')
export class TarefaController {
  constructor(private service: TarefaService) {}

  @Post()
  criar(@Body() dto: CriarTarefaDto) {
    return this.service.criarTarefa(dto);
  }

  @Post(':id/iniciar')
  iniciar(@Param('id', ParseIntPipe) id: number) {
    return this.service.iniciarTarefa(id);
  }
}
