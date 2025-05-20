import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Put,
  Delete,
  ParseIntPipe,
  Patch,
  Query,
  DefaultValuePipe,
  ParseBoolPipe,
  ParseEnumPipe,
} from '@nestjs/common';
import { FiltrosTarefa, TarefaDto, TarefaService } from './tarefa.service';
import { StatusTarefa, PrioridadeTarefa } from '@prisma/client';

@Controller('tarefas')
export class TarefaController {
  constructor(private readonly tarefaService: TarefaService) {}

  @Get()
  async listarTarefas(
    @Query('pagina', new DefaultValuePipe(1), ParseIntPipe) pagina: number,
    @Query('limite', new DefaultValuePipe(10), ParseIntPipe) limite: number,
    @Query('status', new ParseEnumPipe(StatusTarefa, { optional: true }))
    status?: StatusTarefa,
    @Query(
      'tipo',
      new ParseEnumPipe(['SIMPLES', 'PROJETO'], { optional: true }),
    )
    tipo?: 'SIMPLES' | 'PROJETO',
    @Query(
      'prioridade',
      new ParseEnumPipe(PrioridadeTarefa, { optional: true }),
    )
    prioridade?: PrioridadeTarefa,
    @Query('concluida', new ParseBoolPipe({ optional: true }))
    concluida?: boolean,
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
  ) {
    const filtros: FiltrosTarefa = {
      ...(status && { status }),
      ...(tipo && { tipo }),
      ...(prioridade && { prioridade }),
      ...(concluida !== undefined && { concluida }),
      ...(dataInicio && { dataInicio: new Date(dataInicio) }),
      ...(dataFim && { dataFim: new Date(dataFim) }),
    };

    return this.tarefaService.listarTarefas(pagina, limite, filtros);
  }

  @Get(':id/detalhes')
  tarefaDetalhes(@Param('id', ParseIntPipe) id: number) {
    return this.tarefaService.tarefaDetalhes(id);
  }

  @Post()
  criar(@Body() dto: TarefaDto) {
    return this.tarefaService.criarTarefa(dto);
  }

  @Post(':id/clonar')
  clonar(@Param('id', ParseIntPipe) id: number, @Body() dto?: TarefaDto) {
    return this.tarefaService.clonarTarefa(id, dto);
  }

  @Put(':id')
  atualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: TarefaDto) {
    return this.tarefaService.atualizarTarefa(id, dto);
  }

  @Patch(':id/iniciar')
  iniciar(@Param('id', ParseIntPipe) id: number) {
    return this.tarefaService.iniciarTarefa(id);
  }

  @Patch(':id/concluir')
  concluir(@Param('id', ParseIntPipe) id: number) {
    return this.tarefaService.concluirTarefa(id);
  }

  @Delete(':id')
  apagar(@Param('id', ParseIntPipe) id: number) {
    return this.tarefaService.apagarTarefa(id);
  }
}
